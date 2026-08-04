import { baseUrl, sendMail } from "@/lib/mail";
import { BillingPeriod, PLAN_LABELS } from "@/lib/access";
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from "@/lib/tokens";

const SIGNATURE = "\n\n—\nВторой мозг педиатра\nБыстро. Удобно. Достоверно.";

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU");
}

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  token: string;
}) {
  const link = `${baseUrl()}/verify-email?token=${params.token}`;
  await sendMail({
    to: params.to,
    subject: "Подтвердите email — Второй мозг педиатра",
    text:
      `${params.name}, здравствуйте!\n\n` +
      `Вы зарегистрировались на сайте «Второй мозг педиатра». ` +
      `Чтобы подтвердить адрес почты, перейдите по ссылке:\n\n${link}\n\n` +
      `Ссылка действует ${EMAIL_VERIFICATION_TTL_HOURS} часа. ` +
      `Если вы не регистрировались, просто проигнорируйте это письмо.` +
      SIGNATURE,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  token: string;
}) {
  const link = `${baseUrl()}/reset-password?token=${params.token}`;
  await sendMail({
    to: params.to,
    subject: "Восстановление пароля — Второй мозг педиатра",
    text:
      `${params.name}, здравствуйте!\n\n` +
      `Вы запросили смену пароля. Перейдите по ссылке, чтобы задать новый:\n\n${link}\n\n` +
      `Ссылка действует ${PASSWORD_RESET_TTL_MINUTES} минут и сработает один раз. ` +
      `Если вы не запрашивали смену пароля, ничего делать не нужно — ` +
      `текущий пароль останется прежним.` +
      SIGNATURE,
  });
}

export async function sendPaymentSuccessEmail(params: {
  to: string;
  name: string;
  period: BillingPeriod;
  periodEnd: Date;
}) {
  await sendMail({
    to: params.to,
    subject: "Подписка активирована — Второй мозг педиатра",
    text:
      `${params.name}, спасибо за оплату!\n\n` +
      `Подписка «${PLAN_LABELS[params.period]}» активна до ${formatDate(params.periodEnd)}. ` +
      `Вся библиотека заметок уже открыта: ${baseUrl()}/notes\n\n` +
      `Чек по платежу придёт отдельным письмом от сервиса «Мой налог».` +
      SIGNATURE,
  });
}

export async function sendExpiryReminderEmail(params: {
  to: string;
  name: string;
  periodEnd: Date;
  daysLeft: number;
}) {
  const days = params.daysLeft === 1 ? "1 день" : `${params.daysLeft} дня`;
  await sendMail({
    to: params.to,
    subject: "Подписка скоро закончится — Второй мозг педиатра",
    text:
      `${params.name}, здравствуйте!\n\n` +
      `Ваша подписка действует ещё ${days} — до ${formatDate(params.periodEnd)}. ` +
      `Продлить можно в личном кабинете: ${baseUrl()}/account\n\n` +
      `После окончания останется доступ к бесплатным заметкам.` +
      SIGNATURE,
  });
}
