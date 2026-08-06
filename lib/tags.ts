/**
 * Теги — свободные строки без справочника, и до сих пор их регистр зависел от
 * источника: из папок хранилища приходило «Неотложка», из админки — «неотложка».
 * В облаке фильтров на `/notes` это два разных тега, а поиск по тегу сравнивает
 * строки точно, поэтому половина заметок терялась.
 *
 * Приводим к одному виду: заглавная первая буква, остальное как написано.
 * Полный нижний регистр не годится — он превратил бы «ОКИ» и «ЖДА» в «оки» и
 * «жда», а такие сокращения в педиатрии носят смысл.
 */
export function normalizeTag(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed[0].toLocaleUpperCase("ru") + trimmed.slice(1);
}

/**
 * Список тегов из строки через запятую или из готового массива: нормализует,
 * выбрасывает пустые и схлопывает повторы без учёта регистра — «Отит» и «отит»
 * должны остаться одним тегом.
 */
export function parseTags(raw: string | string[]): string[] {
  const items = Array.isArray(raw) ? raw : raw.split(",");
  const byKey = new Map<string, string>();

  for (const item of items) {
    const tag = normalizeTag(item);
    if (!tag) continue;

    const key = tag.toLocaleLowerCase("ru");
    if (!byKey.has(key)) byKey.set(key, tag);
  }

  return [...byKey.values()];
}
