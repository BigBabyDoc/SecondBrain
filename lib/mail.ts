import * as Sentry from "@sentry/nextjs";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
};

/**
 * Чистая функция, чтобы настройки можно было проверить тестами.
 * Возвращает null, если SMTP не сконфигурирован — это не ошибка, а режим
 * разработки: письма печатаются в консоль.
 */
export function resolveSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  const parsed = Number(env.SMTP_PORT);
  const port = Number.isFinite(parsed) && parsed > 0 ? parsed : 465;

  return {
    host,
    port,
    // 465 — SMTPS (шифрование с первого байта), 587 — STARTTLS.
    secure: port === 465,
    auth: { user, pass },
  };
}

export function mailFrom(): string {
  return process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || "no-reply@localhost";
}

/**
 * Транспорт переиспользуется между письмами: на каждое письмо новое TLS-соединение
 * — это лишние задержки, а почтовые провайдеры вроде Mail.ru считают частые
 * переподключения подозрительными. pool держит соединение открытым.
 *
 * rateDelta/rateLimit — самоограничение, чтобы рассылка напоминаний из cron
 * не выглядела всплеском и не упёрлась в лимиты ящика.
 */
let transporter: Transporter | null = null;

function mailer(config: SmtpConfig): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      ...config,
      pool: true,
      maxConnections: 1,
      maxMessages: 50,
      rateDelta: 1000,
      rateLimit: 3,
    });
  }
  return transporter;
}

/** Сбрасывает закэшированный транспорт — нужно, если поменяли настройки на лету. */
export function resetMailer(): void {
  transporter?.close();
  transporter = null;
}

export type MailResult =
  | { status: "sent"; messageId: string }
  | { status: "skipped" }
  | { status: "failed"; error: string };

/**
 * Отправляет письмо. Исключение наружу не пробрасывается: письмо не должно
 * ломать регистрацию или оплату. Но результат возвращается, а сбой уходит
 * в Sentry — иначе отвалившийся SMTP означал бы, что пользователи молча
 * перестали получать подтверждения, и узнали бы мы об этом от них.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = resolveSmtpConfig();

  if (!config) {
    console.info(
      `[mail] SMTP не настроен — письмо не отправлено.\n` +
        `  Кому: ${message.to}\n  Тема: ${message.subject}\n${message.text}`
    );
    return { status: "skipped" };
  }

  try {
    const info = await mailer(config).sendMail({
      from: mailFrom(),
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { status: "sent", messageId: info.messageId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[mail] Не удалось отправить письмо на ${message.to}: ${reason}`);
    Sentry.captureException(error, {
      tags: { area: "mail" },
      // Тема — не персональные данные, в отличие от адреса и текста письма.
      extra: { subject: message.subject },
    });
    return { status: "failed", error: reason };
  }
}

/**
 * Проверяет, что до SMTP-сервера есть связь и учётные данные приняты,
 * не отправляя письмо. Используется скриптом диагностики.
 */
export async function verifySmtp(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const config = resolveSmtpConfig();
  if (!config) {
    return { ok: false, reason: "SMTP не настроен: заполните SMTP_HOST, SMTP_USER, SMTP_PASSWORD" };
  }
  try {
    await mailer(config).verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export function baseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}
