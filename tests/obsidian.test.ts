import { describe, expect, it } from "vitest";
import {
  convertCallouts,
  convertWikilinks,
  excerptFrom,
  obsidianToMarkdown,
  readAliases,
  replaceEmbeds,
  stripFrontmatter,
} from "@/lib/obsidian";

const noNotes = () => null;

describe("stripFrontmatter", () => {
  it("убирает YAML в начале файла", () => {
    const source = "---\naliases:\n  - Раздел педиатрии\n---\n# Тексты\nсодержимое";
    expect(stripFrontmatter(source)).toBe("# Тексты\nсодержимое");
  });

  it("не трогает файл без фронтматтера", () => {
    expect(stripFrontmatter("# Заголовок\nтекст")).toBe("# Заголовок\nтекст");
  });

  it("не съедает текст, если блок не закрыт", () => {
    const source = "---\naliases: [a]\n# Заголовок";
    expect(stripFrontmatter(source)).toBe(source);
  });

  it("оставляет горизонтальную линейку в середине текста", () => {
    const source = "# Заголовок\n\n---\n\nдальше";
    expect(stripFrontmatter(source)).toBe(source);
  });
});

describe("readAliases", () => {
  it("читает список", () => {
    expect(readAliases("---\naliases:\n  - Раздел педиатрии\n  - Аллергология\n---\n# Т")).toEqual([
      "Раздел педиатрии",
      "Аллергология",
    ]);
  });

  it("читает запись в строку", () => {
    expect(readAliases('---\naliases: ["Раздел", Аллергология]\n---\n')).toEqual([
      "Раздел",
      "Аллергология",
    ]);
  });

  it("возвращает пусто без фронтматтера и без ключа", () => {
    expect(readAliases("# Заголовок")).toEqual([]);
    expect(readAliases("---\ntags:\n  - a\n---\n")).toEqual([]);
  });
});

describe("convertCallouts", () => {
  it("переносит тело коллаута внутрь цитаты", () => {
    const source = "> [! Note]\nВысыпания захватывают весь покров.\n\nДальше текст.";

    expect(convertCallouts(source)).toBe(
      "> **Примечание**\n>\n> Высыпания захватывают весь покров.\n\nДальше текст."
    );
  });

  it("знает типы независимо от регистра", () => {
    expect(convertCallouts("> [!Warning]\nОсторожно.")).toBe(
      "> **Внимание**\n>\n> Осторожно."
    );
  });

  it("оставляет незнакомый тип как подпись", () => {
    expect(convertCallouts("> [!custom]\nтекст")).toBe("> **Custom**\n>\n> текст");
  });

  it("не дублирует `>` у уже размеченного тела", () => {
    expect(convertCallouts("> [!Tip]\n> подсказка")).toBe("> **Совет**\n>\n> подсказка");
  });

  it("не трогает обычную цитату", () => {
    expect(convertCallouts("> просто цитата")).toBe("> просто цитата");
  });
});

describe("replaceEmbeds", () => {
  it("удаляет строку, где было только встраивание картинки", () => {
    const source = "Текст до\n![[Pasted image 20260328111722.png]]\n*Подпись*";
    const { content, droppedEmbeds } = replaceEmbeds(source);

    expect(content).toBe("Текст до\n*Подпись*");
    expect(droppedEmbeds).toEqual(["Pasted image 20260328111722.png"]);
  });

  it("сохраняет остальной текст строки", () => {
    expect(replaceEmbeds("до ![[схема.png]] после").content).toBe("до  после");
  });

  it("оставляет встроенную заметку вики-ссылкой", () => {
    const { content, droppedEmbeds } = replaceEmbeds("![[Индекс SCORAD]]");

    expect(content).toBe("[[Индекс SCORAD]]");
    expect(droppedEmbeds).toEqual([]);
  });

  it("не трогает обычные картинки Markdown", () => {
    const source = "![подпись](/api/media/abc)";
    expect(replaceEmbeds(source)).toEqual({ content: source, droppedEmbeds: [] });
  });

  it("подставляет разметку загруженного вложения", () => {
    const { content, droppedEmbeds } = replaceEmbeds(
      "![[схема.png]]",
      (name) => `![${name}](/api/media/xyz)`
    );

    expect(content).toBe("![схема.png](/api/media/xyz)");
    expect(droppedEmbeds).toEqual([]);
  });

  it("выбрасывает вложение, которое не удалось загрузить", () => {
    const { content, droppedEmbeds } = replaceEmbeds("до ![[видео.mp4]] после", () => null);

    expect(content).toBe("до  после");
    expect(droppedEmbeds).toEqual(["видео.mp4"]);
  });
});

describe("convertWikilinks", () => {
  it("ссылается на импортированную заметку", () => {
    const { content } = convertWikilinks("- [[Крапивница]]", () => "krapivnitsa");
    expect(content).toBe("- [Крапивница](/notes/krapivnitsa)");
  });

  it("подставляет подпись из алиаса", () => {
    const { content } = convertWikilinks("[[Крапивница|про крапивницу]]", () => "krapivnitsa");
    expect(content).toBe("[про крапивницу](/notes/krapivnitsa)");
  });

  it("отбрасывает якорь раздела — на сайте таких адресов нет", () => {
    const { content } = convertWikilinks("[[Индекс SCORAD#Оценка]]", () => "indeks-scorad");
    expect(content).toBe("[Индекс SCORAD](/notes/indeks-scorad)");
  });

  it("оставляет текст вместо ссылки в никуда", () => {
    const { content, unresolvedLinks } = convertWikilinks(
      "- [[Себорейный дерматит#Клиника]]",
      noNotes
    );

    expect(content).toBe("- Себорейный дерматит");
    expect(unresolvedLinks).toEqual(["Себорейный дерматит"]);
  });
});

describe("excerptFrom", () => {
  it("берёт первый абзац, пропуская заголовок", () => {
    expect(excerptFrom("# Определения\n\n**Крапивница** — группа заболеваний")).toBe(
      "Крапивница — группа заболеваний"
    );
  });

  it("обрезает по границе слова", () => {
    const long = `# Заголовок\n\n${"слово ".repeat(60).trim()}`;
    const excerpt = excerptFrom(long, 40);

    expect(excerpt.length).toBeLessThanOrEqual(41);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt).not.toContain(" …");
  });

  it("пропускает таблицы, цитаты и разделители", () => {
    expect(excerptFrom("# Т\n\n| a | b |\n\n> цитата\n\n***\n\nнастоящий текст")).toBe(
      "настоящий текст"
    );
  });

  it("пропускает список из одних ссылок", () => {
    expect(
      excerptFrom("# Тексты\n- [Атопический дерматит](/notes/a)\n- [Крапивница](/notes/k)")
    ).toBe("");
  });

  it("возвращает пустую строку, когда текста нет", () => {
    expect(excerptFrom("# Только заголовок")).toBe("");
  });
});

describe("obsidianToMarkdown", () => {
  it("прогоняет файл через все преобразования", () => {
    const source = [
      "---",
      "aliases:",
      "  - Раздел",
      "---",
      "**Крапивница** — группа заболеваний",
      "![[Pasted image 1.png]]",
      "*Подпись*",
      "> [! Note]",
      "Важное уточнение.",
      "",
      "Смотри [[Индекс SCORAD]] и [[Лекарственные препараты#Цетиризин]].",
    ].join("\n");

    const result = obsidianToMarkdown(source, (target) =>
      target === "Индекс SCORAD" ? "indeks-scorad" : null
    );

    expect(result.content).toBe(
      [
        "**Крапивница** — группа заболеваний",
        "*Подпись*",
        "> **Примечание**",
        ">",
        "> Важное уточнение.",
        "",
        "Смотри [Индекс SCORAD](/notes/indeks-scorad) и Лекарственные препараты.",
      ].join("\n")
    );
    expect(result.droppedEmbeds).toEqual(["Pasted image 1.png"]);
    expect(result.unresolvedLinks).toEqual(["Лекарственные препараты"]);
  });
});
