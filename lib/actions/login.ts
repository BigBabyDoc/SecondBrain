"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { isRateLimited, minutesUntilUnlock } from "@/lib/rate-limit";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = (formData.get("callbackUrl") as string) || "/notes";

  const normalizedEmail = typeof email === "string" ? email.toLowerCase() : "";

  if (normalizedEmail && (await isRateLimited(normalizedEmail))) {
    const minutes = await minutesUntilUnlock(normalizedEmail);
    return {
      error: `Слишком много неудачных попыток входа. Попробуйте через ${minutes} мин. или восстановите пароль.`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      // Эта попытка могла стать последней до блокировки — сообщаем об этом сразу.
      if (normalizedEmail && (await isRateLimited(normalizedEmail))) {
        const minutes = await minutesUntilUnlock(normalizedEmail);
        return {
          error: `Слишком много неудачных попыток входа. Попробуйте через ${minutes} мин. или восстановите пароль.`,
        };
      }
      return { error: "Неверный email или пароль" };
    }
    throw error;
  }
}
