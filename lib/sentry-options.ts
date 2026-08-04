/**
 * Общие настройки Sentry. DSN необязателен: без переменной SENTRY_DSN
 * (или NEXT_PUBLIC_SENTRY_DSN на клиенте) SDK не инициализируется и
 * никуда ничего не отправляет — приложение работает как обычно.
 */
export const sentryOptions = {
  // Доля трассируемых запросов. Полная трассировка на проде избыточна и платна.
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  environment: process.env.NODE_ENV,
  // Персональные данные в отчёты не попадают: email и содержимое форм
  // не нужны для диагностики, а хранить их у стороннего сервиса нежелательно.
  sendDefaultPii: false,
};

export function serverDsn(): string | undefined {
  return process.env.SENTRY_DSN || undefined;
}

export function clientDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;
}
