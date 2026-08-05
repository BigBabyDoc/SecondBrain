import "dotenv/config";
import { mailFrom, resolveSmtpConfig, sendMail, verifySmtp } from "../lib/mail";

/**
 * Диагностика почты: `npm run mail:check -- адрес@example.com`
 *
 * Проверяет по шагам — что настройки прочитаны, что до сервера есть связь
 * и пароль принят, и (если указан адрес) что письмо реально уходит.
 * Нужен, потому что иначе единственный способ проверить SMTP — регистрировать
 * пользователя и ждать письма.
 */
async function main() {
  const recipient = process.argv[2];

  const config = resolveSmtpConfig();
  console.log("1. Настройки");
  if (!config) {
    console.error(
      "   ✗ SMTP не настроен — письма будут печататься в консоль.\n" +
        "     Заполните SMTP_HOST, SMTP_USER, SMTP_PASSWORD в .env"
    );
    process.exit(1);
  }
  console.log(`   ✓ ${config.host}:${config.port} (${config.secure ? "SSL" : "STARTTLS"})`);
  console.log(`     пользователь: ${config.auth.user}`);
  console.log(`     от кого: ${mailFrom()}`);

  if (mailFrom().toLowerCase() !== config.auth.user.toLowerCase()) {
    console.warn(
      "   ! MAIL_FROM не совпадает с SMTP_USER. Большинство провайдеров, включая\n" +
        "     Mail.ru, отклоняют такие письма или помечают их как спам."
    );
  }

  console.log("2. Соединение и авторизация");
  const verified = await verifySmtp();
  if (!verified.ok) {
    console.error(`   ✗ ${verified.reason}`);
    if (/auth|credential|535|password/i.test(verified.reason)) {
      console.error(
        "     Для Mail.ru нужен пароль для внешнего приложения, а не пароль от аккаунта:\n" +
          "     Настройки → Безопасность → Пароли для внешних приложений."
      );
    }
    process.exit(1);
  }
  console.log("   ✓ сервер принял учётные данные");

  if (!recipient) {
    console.log("3. Тестовое письмо — пропущено");
    console.log("   Укажите адрес, чтобы отправить: npm run mail:check -- you@example.com");
    return;
  }

  console.log(`3. Тестовое письмо на ${recipient}`);
  const result = await sendMail({
    to: recipient,
    subject: "Проверка почты — Второй мозг педиатра",
    text:
      "Это тестовое письмо. Если вы его видите, отправка с корпоративного ящика настроена верно.\n\n" +
      `Отправлено: ${new Date().toLocaleString("ru-RU")}`,
  });

  if (result.status === "sent") {
    console.log(`   ✓ отправлено, id: ${result.messageId}`);
    console.log("     Проверьте входящие и папку «Спам».");
  } else if (result.status === "failed") {
    console.error(`   ✗ ${result.error}`);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("Непредвиденная ошибка:", error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
