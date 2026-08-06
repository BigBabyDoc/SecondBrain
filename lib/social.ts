export type SocialLink = { name: string; href: string };

export const CONTACT_EMAIL = "second_brain_pediatra@mail.ru";

const TELEGRAM_DEFAULT = "https://t.me/Vtoroy_Mozg_Pediatra";
const VK_DEFAULT = "https://vk.ru/vtoroy_mozg_pediatra";

/**
 * Ссылки на сообщества проекта. Адреса публичные и постоянные, поэтому заданы
 * прямо здесь — сайт показывает кнопки без настройки окружения. Переменные
 * TELEGRAM_URL и VK_URL перекрывают значение (пустая строка убирает кнопку).
 */
export function socialLinks(): SocialLink[] {
  const links: SocialLink[] = [];

  const telegram = process.env.TELEGRAM_URL?.trim() ?? TELEGRAM_DEFAULT;
  if (telegram) links.push({ name: "Telegram", href: telegram });

  const vk = process.env.VK_URL?.trim() ?? VK_DEFAULT;
  if (vk) links.push({ name: "ВКонтакте", href: vk });

  return links;
}
