import { describe, expect, it } from "vitest";
import { resolveSmtpConfig } from "@/lib/mail";

const env = (values: Record<string, string | undefined>) => values as NodeJS.ProcessEnv;

const FULL = {
  SMTP_HOST: "smtp.mail.ru",
  SMTP_USER: "Second_Brain_Pediatra@mail.ru",
  SMTP_PASSWORD: "app-password",
};

describe("resolveSmtpConfig", () => {
  it("собирает настройки, когда заданы хост, пользователь и пароль", () => {
    const config = resolveSmtpConfig(env({ ...FULL, SMTP_PORT: "465" }));
    expect(config).toEqual({
      host: "smtp.mail.ru",
      port: 465,
      secure: true,
      auth: { user: "Second_Brain_Pediatra@mail.ru", pass: "app-password" },
    });
  });

  it("по умолчанию использует 465 и SSL", () => {
    const config = resolveSmtpConfig(env(FULL));
    expect(config?.port).toBe(465);
    expect(config?.secure).toBe(true);
  });

  it("на 587 переключается на STARTTLS", () => {
    expect(resolveSmtpConfig(env({ ...FULL, SMTP_PORT: "587" }))?.secure).toBe(false);
  });

  it("нечисловой порт не ломает конфиг, а откатывается к 465", () => {
    expect(resolveSmtpConfig(env({ ...FULL, SMTP_PORT: "не-число" }))?.port).toBe(465);
  });

  it("пустая строка порта тоже даёт 465, а не 0", () => {
    expect(resolveSmtpConfig(env({ ...FULL, SMTP_PORT: "" }))?.port).toBe(465);
  });

  it("без хоста, пользователя или пароля возвращает null — это режим разработки", () => {
    expect(resolveSmtpConfig(env({ ...FULL, SMTP_HOST: undefined }))).toBeNull();
    expect(resolveSmtpConfig(env({ ...FULL, SMTP_USER: undefined }))).toBeNull();
    expect(resolveSmtpConfig(env({ ...FULL, SMTP_PASSWORD: undefined }))).toBeNull();
  });

  it("пробелы вокруг значений не мешают: их легко занести при копировании", () => {
    const config = resolveSmtpConfig(
      env({ ...FULL, SMTP_HOST: "  smtp.mail.ru  ", SMTP_USER: " box@mail.ru " })
    );
    expect(config?.host).toBe("smtp.mail.ru");
    expect(config?.auth.user).toBe("box@mail.ru");
  });

  it("настройки из пробелов считаются незаполненными", () => {
    expect(resolveSmtpConfig(env({ ...FULL, SMTP_HOST: "   " }))).toBeNull();
  });
});
