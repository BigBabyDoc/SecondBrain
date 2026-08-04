import nodemailer from "nodemailer";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host,
    port,
    // 465 — SMTPS (шифрование с первого байта), 587 — STARTTLS
    secure: port === 465,
    auth: { user, pass },
  };
}

export function mailFrom() {
  return process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "no-reply@localhost";
}

/**
 * Отправляет письмо через SMTP. Если SMTP не настроен (нет переменных окружения),
 * письмо не отправляется, а печатается в консоль — чтобы локальная разработка
 * и первый запуск работали без почтового ящика.
 *
 * Ошибки отправки логируются, но не пробрасываются: письмо не должно ломать
 * регистрацию или оплату.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const config = smtpConfig();

  if (!config) {
    console.info(
      `[mail] SMTP не настроен — письмо не отправлено.\n` +
        `  Кому: ${message.to}\n  Тема: ${message.subject}\n${message.text}`
    );
    return;
  }

  try {
    const transporter = nodemailer.createTransport(config);
    await transporter.sendMail({
      from: mailFrom(),
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  } catch (error) {
    console.error(`[mail] Не удалось отправить письмо на ${message.to}:`, error);
  }
}

export function baseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}
