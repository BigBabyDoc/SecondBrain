"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { issueEmailVerification } from "@/lib/actions/email-verification";
import { grantConsent, requestIp } from "@/lib/consents";

/** Отметка проставлена, если браузер прислал значение "on". */
const checkbox = (message: string) => z.literal("on", { message });

const registerSchema = z.object({
  name: z.string().min(2, "Укажите имя"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов"),
  terms: checkbox("Нужно принять Пользовательское соглашение и Публичную оферту"),
  personalData: checkbox("Без согласия на обработку персональных данных регистрация невозможна"),
  professionalStatus: checkbox(
    "Сервис предназначен для медицинских работников старше 18 лет — подтвердите это"
  ),
  // Добровольное: отсутствие отметки не должно мешать регистрации.
  marketing: z.literal("on").optional(),
});

export type RegisterState = {
  error?: string;
};

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    terms: formData.get("terms"),
    personalData: formData.get("personalData"),
    professionalStatus: formData.get("professionalStatus"),
    marketing: formData.get("marketing") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте введённые данные" };
  }

  const { name, password, marketing } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Пользователь с таким email уже зарегистрирован" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      subscription: {
        create: {
          tier: "FREE",
          status: "ACTIVE",
        },
      },
    },
  });

  // Каждое согласие фиксируется отдельной записью: закон требует подтверждать
  // факт, дату, время, IP и версию документа по каждому из них.
  const ip = await requestIp();
  await grantConsent({ userId: user.id, type: "TERMS", ip });
  await grantConsent({ userId: user.id, type: "PERSONAL_DATA", ip });
  await grantConsent({ userId: user.id, type: "PROFESSIONAL_STATUS", ip });
  if (marketing === "on") {
    await grantConsent({ userId: user.id, type: "MARKETING", ip });
  }

  await issueEmailVerification(user);

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/notes",
  });

  return {};
}
