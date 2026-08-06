import { describe, expect, it } from "vitest";
import { normalizeTag, parseTags } from "@/lib/tags";

describe("normalizeTag", () => {
  it("поднимает первую букву", () => {
    expect(normalizeTag("неотложка")).toBe("Неотложка");
  });

  it("не трогает остальные буквы — иначе сокращения потеряют смысл", () => {
    expect(normalizeTag("ОКИ")).toBe("ОКИ");
    expect(normalizeTag("ЖДА")).toBe("ЖДА");
    expect(normalizeTag("разбор случая")).toBe("Разбор случая");
  });

  it("убирает лишние пробелы", () => {
    expect(normalizeTag("  редкий   случай ")).toBe("Редкий случай");
  });

  it("возвращает пустую строку для пустого тега", () => {
    expect(normalizeTag("   ")).toBe("");
  });
});

describe("parseTags", () => {
  it("разбирает строку через запятую", () => {
    expect(parseTags("лихорадка, Неотложка")).toEqual(["Лихорадка", "Неотложка"]);
  });

  it("схлопывает повторы независимо от регистра", () => {
    expect(parseTags("Отит, отит, ОТИТ")).toEqual(["Отит"]);
  });

  it("выбрасывает пустые куски", () => {
    expect(parseTags("отит, , ,антибиотики,")).toEqual(["Отит", "Антибиотики"]);
  });

  it("принимает готовый массив — так теги приходят из папок хранилища", () => {
    expect(parseTags(["Медицина", "педиатрия"])).toEqual(["Медицина", "Педиатрия"]);
  });

  it("идемпотентна", () => {
    const once = parseTags("отит, лихорадка");
    expect(parseTags(once)).toEqual(once);
  });

  it("сохраняет порядок первого вхождения", () => {
    expect(parseTags("Педиатрия, Медицина, педиатрия")).toEqual(["Педиатрия", "Медицина"]);
  });
});
