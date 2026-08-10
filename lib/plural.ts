/**
 * Русское склонение существительного при числительном.
 *
 * Формы задаются в порядке «1 / 2 / 5»: `plural(3, ["день", "дня", "дней"])`.
 * Отдельная проверка на 11–14 обязательна — эти числа оканчиваются на 1–4,
 * но требуют форму «дней», как и всё, что оканчивается на 0 и 5–9.
 */
export function plural(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count);
  const tail = abs % 100;
  if (tail >= 11 && tail <= 14) return forms[2];

  switch (abs % 10) {
    case 1:
      return forms[0];
    case 2:
    case 3:
    case 4:
      return forms[1];
    default:
      return forms[2];
  }
}

export const DAYS: [string, string, string] = ["день", "дня", "дней"];
export const VIEWS: [string, string, string] = ["просмотр", "просмотра", "просмотров"];
