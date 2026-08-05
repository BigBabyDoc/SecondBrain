export type SocialLink = { name: string; href: string };

export const CONTACT_EMAIL = "second_brain_pediatra@mail.ru";

/**
 * Ссылки на сообщества проекта. Задаются переменными окружения TELEGRAM_URL
 * и VK_URL — кнопка не появится, пока адрес не указан, чтобы на сайте не было
 * ссылок в никуда.
 */
export function socialLinks(): SocialLink[] {
  const links: SocialLink[] = [];

  const telegram = process.env.TELEGRAM_URL?.trim();
  if (telegram) links.push({ name: "Telegram", href: telegram });

  const vk = process.env.VK_URL?.trim();
  if (vk) links.push({ name: "ВКонтакте", href: vk });

  return links;
}
