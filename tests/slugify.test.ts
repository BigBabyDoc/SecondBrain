import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slugify";

describe("slugify", () => {
  it("транслитерирует кириллицу", () => {
    expect(slugify("Лихорадка без очага")).toBe("lihoradka-bez-ochaga");
  });

  it("схлопывает пробелы и знаки препинания в один дефис", () => {
    expect(slugify("Отит: когда антибиотик?")).toBe("otit-kogda-antibiotik");
  });

  it("не оставляет дефисы по краям", () => {
    expect(slugify("  — Дозировки —  ")).toBe("dozirovki");
  });

  it("сохраняет цифры", () => {
    expect(slugify("Дети до 3 лет")).toBe("deti-do-3-let");
  });

  it("обрабатывает ё и щ", () => {
    expect(slugify("Ёж и щука")).toBe("ezh-i-schuka");
  });
});
