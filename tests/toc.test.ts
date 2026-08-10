import { describe, expect, it } from "vitest";
import {
  LEAD_MAX_CHARS,
  extractHeadings,
  headingId,
  headingPalette,
  leadParagraph,
  type HeadingLevel,
} from "@/lib/toc";

describe("extractHeadings", () => {
  it("собирает заголовки трёх уровней по порядку", () => {
    const headings = extractHeadings("# Первый\n\nтекст\n\n## Второй\n\n### Третий");
    expect(headings.map((h) => [h.level, h.text])).toEqual([
      [1, "Первый"],
      [2, "Второй"],
      [3, "Третий"],
    ]);
  });

  it("не считает заголовком строку внутри блока кода", () => {
    const md = "## Настоящий\n\n```bash\n# это комментарий\n```\n\n## Тоже настоящий";
    expect(extractHeadings(md).map((h) => h.text)).toEqual(["Настоящий", "Тоже настоящий"]);
  });

  it("поддерживает четвёртый уровень", () => {
    expect(extractHeadings("#### Четвёртый")[0]).toMatchObject({ level: 4, text: "Четвёртый" });
  });

  it("игнорирует уровни глубже четвёртого", () => {
    expect(extractHeadings("##### Пятый")).toEqual([]);
  });

  it("убирает разметку выделения из текста заголовка", () => {
    expect(extractHeadings("## **Дозировки** `по весу`")[0].text).toBe("Дозировки по весу");
  });

  it("даёт разные якоря одинаковым заголовкам", () => {
    const headings = extractHeadings("## Тактика\n\n## Тактика");
    expect(headings[0].id).not.toBe(headings[1].id);
  });

  it("не находит заголовков в тексте без них", () => {
    expect(extractHeadings("Просто абзац.\n\nЕщё абзац — с тире.")).toEqual([]);
  });

  it("транслитерирует кириллицу в якорь", () => {
    expect(extractHeadings("## Тактика")[0].id).toBe("taktika-0");
  });
});

describe("headingId", () => {
  it("подставляет запасной якорь, если из текста ничего не осталось", () => {
    expect(headingId("«»", 3)).toBe("razdel-3");
  });
});

describe("headingPalette", () => {
  it("даёт разный цвет каждому уровню вложенности", () => {
    const colors = [1, 2, 3, 4].map((l) => headingPalette(l as HeadingLevel).text);
    expect(new Set(colors).size).toBe(4);
  });

  it("использует палитру Nord, голубой — на четвёртом уровне", () => {
    expect(headingPalette(1).text).toBe("text-nord-red");
    expect(headingPalette(2).text).toBe("text-nord-yellow");
    expect(headingPalette(3).text).toBe("text-nord-green");
    expect(headingPalette(4).text).toBe("text-nord-frost");
  });

  it("цвет точки в оглавлении соответствует цвету заголовка", () => {
    for (const level of [1, 2, 3, 4] as const) {
      const p = headingPalette(level);
      expect(p.dot.replace("bg-", "")).toBe(p.text.replace("text-", ""));
    }
  });
});

describe("leadParagraph", () => {
  it("берёт первый абзац, пропуская заголовок", () => {
    const md = "# Заголовок\n\nПервый абзац заметки.\n\nВторой абзац.";
    expect(leadParagraph(md)).toBe("Первый абзац заметки.");
  });

  it("склеивает строки одного абзаца", () => {
    expect(leadParagraph("Строка одна\nстрока два\n\nдругой абзац")).toBe(
      "Строка одна строка два"
    );
  });

  it("пропускает список и берёт текст после него", () => {
    const md = "## Раздел\n\n- пункт\n- пункт\n\nСвязный текст.";
    expect(leadParagraph(md)).toBe("Связный текст.");
  });

  it("не заглядывает внутрь блока кода", () => {
    const md = "```\nконстанта = 1\n```\n\nОбычный текст.";
    expect(leadParagraph(md)).toBe("Обычный текст.");
  });

  it("снимает разметку выделения и разворачивает ссылку", () => {
    expect(leadParagraph("**Жирный** и [ссылка](https://example.com) внутри.")).toBe(
      "Жирный и ссылка внутри."
    );
  });

  it("обрезает длинный абзац по границе слова", () => {
    const long = "слово ".repeat(200).trim();
    const lead = leadParagraph(long);

    expect(lead.length).toBeLessThanOrEqual(LEAD_MAX_CHARS + 1);
    expect(lead.endsWith("…")).toBe(true);
    expect(lead).not.toContain("сло…");
  });

  it("возвращает пустую строку, если связного текста нет", () => {
    expect(leadParagraph("# Только заголовок\n\n| a | b |\n| - | - |")).toBe("");
  });
});
