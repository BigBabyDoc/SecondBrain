import { baseUrl, sendMail } from "@/lib/mail";
import { BillingPeriod, PLAN_LABELS, PLAN_RENEWAL_CADENCE } from "@/lib/access";
import { RENEWAL_NOTICE_DAYS } from "@/lib/renewal";
import { unsubscribeToken } from "@/lib/unsubscribe";
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from "@/lib/tokens";

const SIGNATURE = "\n\n—\nВторой мозг педиатра\nБыстро. Удобно. Достоверно.";

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU");
}

function formatMoney(amount: number): string {
  return `${amount} ₽`;
}

/**
 * Рекламное или информационное письмо. Отдельная функция, потому что ссылка
 * «Отписаться» обязана быть в каждом таком письме (п. 6 Согласия № 4, ч. 1
 * ст. 18 ФЗ «О рекламе») — и не должна попадать в сервисные письма: те
 * приходят независимо от согласия на рассылки, и отписаться от них нельзя.
 *
 * Любая будущая рассылка отправляется только через неё.
 */
export async function sendMarketingEmail(params: {
  to: string;
  userId: string;
  subject: string;
  text: string;
}) {
  const link = `${baseUrl()}/unsubscribe?token=${unsubscribeToken(params.userId)}`;
  await sendMail({
    to: params.to,
    subject: params.subject,
    text:
      params.text +
      `\n\nВы получили это письмо, потому что согласились на информационные ` +
      `и рекламные сообщения. Отписаться: ${link}` +
      SIGNATURE,
  });
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
  autoRenew: boolean;
  renewalAmount: number;
  isRenewal: boolean;
  card?: string | null;
}) {
  const opening = params.isRenewal
    ? `${params.name}, подписка продлена.\n\n`
    : `${params.name}, спасибо за оплату!\n\n`;

  // Пункт 8.1.3 оферты: при подключении автопродления пользователю сообщаются
  // сумма, периодичность, дата первого списания и порядок отмены. Это письмо —
  // ближайшая к подключению точка, где всё четыре пункта можно назвать сразу.
  const renewalBlock = params.autoRenew
    ? `\n\nАвтопродление подключено. ${formatMoney(params.renewalAmount)} будет списываться ` +
      `${PLAN_RENEWAL_CADENCE[params.period]}` +
      (params.card ? ` с карты ${params.card}` : "") +
      `; ближайшее списание — ${formatDate(params.periodEnd)}. Мы предупредим о нём ` +
      `письмом за ${RENEWAL_NOTICE_DAYS} дня. Отключить автопродление можно в любой ` +
      `момент в личном кабинете: ${baseUrl()}/account`
    : `\n\nПодписка не продлевается автоматически: следующий период оплачивается ` +
      `вручную в личном кабинете.`;

  await sendMail({
    to: params.to,
    subject: params.isRenewal
      ? "Подписка продлена — Второй мозг педиатра"
      : "Подписка активирована — Второй мозг педиатра",
    text:
      opening +
      `Подписка «${PLAN_LABELS[params.period]}» активна до ${formatDate(params.periodEnd)}. ` +
      `Вся библиотека заметок открыта: ${baseUrl()}/notes` +
      renewalBlock +
      `\n\nЧек по платежу придёт отдельным письмом от сервиса «Мой налог».` +
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

/**
 * Предупреждение о предстоящем автосписании — п. 8.2.2 оферты. Обязательные
 * элементы: сумма, дата списания и прямая ссылка для отмены. Не «напоминание
 * о подписке», а именно уведомление о том, что деньги спишутся.
 */
export async function sendRenewalNoticeEmail(params: {
  to: string;
  name: string;
  period: BillingPeriod;
  chargeDate: Date;
  amount: number;
  card?: string | null;
}) {
  await sendMail({
    to: params.to,
    subject: "Подписка продлится автоматически — Второй мозг педиатра",
    text:
      `${params.name}, здравствуйте!\n\n` +
      `${formatDate(params.chargeDate)} мы автоматически спишем ` +
      `${formatMoney(params.amount)} за следующий период подписки ` +
      `«${PLAN_LABELS[params.period]}»` +
      (params.card ? ` с карты ${params.card}` : "") +
      `.\n\n` +
      `Если продлевать не нужно, отключите автопродление до этой даты — ` +
      `деньги не спишутся: ${baseUrl()}/account\n\n` +
      `Доступ к оплаченному периоду сохраняется до его окончания в любом случае.` +
      SIGNATURE,
  });
}

/**
 * Списание не прошло после всех попыток — п. 8.2.4. Важная часть: сказать, что
 * задолженности не возникает, иначе письмо читается как счёт к оплате.
 */
export async function sendRenewalFailedEmail(params: {
  to: string;
  name: string;
  period: BillingPeriod;
  periodEnd: Date;
}) {
  await sendMail({
    to: params.to,
    subject: "Не удалось продлить подписку — Второй мозг педиатра",
    text:
      `${params.name}, здравствуйте!\n\n` +
      `Мы не смогли списать оплату за следующий период подписки ` +
      `«${PLAN_LABELS[params.period]}» — банк отклонил платёж. Автопродление отключено, ` +
      `новых попыток не будет.\n\n` +
      `Доступ к платным материалам сохраняется до ${formatDate(params.periodEnd)}. ` +
      `Продлить вручную можно в личном кабинете: ${baseUrl()}/account\n\n` +
      `Никакой задолженности за непродлённый период у вас не возникает.` +
      SIGNATURE,
  });
}

/** Подтверждение отмены автопродления — п. 8.4.6 оферты. */
export async function sendAutoRenewalCanceledEmail(params: {
  to: string;
  name: string;
  period: BillingPeriod;
  periodEnd: Date;
}) {
  await sendMail({
    to: params.to,
    subject: "Автопродление отключено — Второй мозг педиатра",
    text:
      `${params.name}, здравствуйте!\n\n` +
      `Автопродление подписки «${PLAN_LABELS[params.period]}» отключено, ` +
      `привязанное платёжное средство удалено. Списаний больше не будет.\n\n` +
      `Доступ к платным материалам сохраняется до ${formatDate(params.periodEnd)} — ` +
      `этот период уже оплачен. Дальше подписку можно продлить вручную ` +
      `в личном кабинете: ${baseUrl()}/account` +
      SIGNATURE,
  });
}

/**
 * Тариф подешевел — п. 8.3.3: меньшая сумма списывается без подтверждения,
 * но пользователя об этом уведомляют. Письмо уходит до списания, вместе с
 * обычным предупреждением, чтобы человек не гадал, почему сумма другая.
 */
export async function sendRenewalPriceLoweredEmail(params: {
  to: string;
  name: string;
  period: BillingPeriod;
  oldAmount: number;
  newAmount: number;
  chargeDate: Date;
}) {
  await sendMail({
    to: params.to,
    subject: "Подписка подешевела — Второй мозг педиатра",
    text:
      `${params.name}, хорошая новость.\n\n` +
      `Стоимость подписки «${PLAN_LABELS[params.period]}» снизилась: было ` +
      `${formatMoney(params.oldAmount)}, стало ${formatMoney(params.newAmount)}. ` +
      `${formatDate(params.chargeDate)} спишется новая, меньшая сумма — ` +
      `подтверждать ничего не нужно.\n\n` +
      `Отключить автопродление можно как обычно: ${baseUrl()}/account` +
      SIGNATURE,
  });
}

/**
 * Тариф подорожал — п. 8.3.2: списание по новой цене возможно только после
 * отдельного подтверждения, поэтому автопродление приостанавливается.
 */
export async function sendRenewalPriceChangedEmail(params: {
  to: string;
  name: string;
  period: BillingPeriod;
  periodEnd: Date;
  oldAmount: number;
  newAmount: number;
}) {
  await sendMail({
    to: params.to,
    subject: "Изменилась стоимость подписки — Второй мозг педиатра",
    text:
      `${params.name}, здравствуйте!\n\n` +
      `Стоимость подписки «${PLAN_LABELS[params.period]}» изменилась: было ` +
      `${formatMoney(params.oldAmount)}, стало ${formatMoney(params.newAmount)}.\n\n` +
      `Автоматическое списание приостановлено — по новой цене мы не спишем ничего ` +
      `без вашего подтверждения. Чтобы продолжить подписку, оформите её в личном ` +
      `кабинете: ${baseUrl()}/account\n\n` +
      `Доступ по текущей оплате сохраняется до ${formatDate(params.periodEnd)}.` +
      SIGNATURE,
  });
}
