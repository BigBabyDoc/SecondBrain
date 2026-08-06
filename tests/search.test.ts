import { describe, expect, it } from "vitest";
import {
  MAX_QUERY_LENGTH,
  groupHeadingAt,
  normalizeQuery,
  orderByTitleRank,
  titleRank,
} from "@/lib/search";

const title = { match: "title" as const };
const content = { match: "content" as const };

describe("groupHeadingAt", () => {
  it("подписывает первую группу и переход ко второй", () => {
    const list = [title, title, content, content];

    expect(list.map((_, index) => groupHeadingAt(list, index))).toEqual([
      "В заголовках",
      null,
      "Упоминается в тексте",
      null,
    ]);
  });

  // Из-за привязки подписи к номеру подсказки находка в тексте попадала под
  // заголовок «В заголовках», когда совпадений по заголовку не было ни одного.
  it("не подписывает находку в тексте как заголовок", () => {
    expect(groupHeadingAt([content, content], 0)).toBe("Упоминается в тексте");
  });

  it("возвращает null за пределами списка", () => {
    expect(groupHeadingAt([title], 5)).toBeNull();
    expect(groupHeadingAt([], 0)).toBeNull();
  });
});

describe("normalizeQuery", () => {
  it("убирает лишние пробелы", () => {
    expect(normalizeQuery("  острый   отит ")).toBe("острый отит");
  });

  it("переживает пустое значение", () => {
    expect(normalizeQuery(null)).toBe("");
    expect(normalizeQuery(undefined)).toBe("");
  });

  it("обрезает слишком длинный запрос", () => {
    expect(normalizeQuery("а".repeat(500))).toHaveLength(MAX_QUERY_LENGTH);
  });
});

describe("titleRank", () => {
  it("ставит точное совпадение выше остальных", () => {
    expect(titleRank("колики", "Колики")).toBeLessThan(titleRank("колики", "Колики UpToDate"));
  });

  it("начало заголовка выше, чем середина", () => {
    expect(titleRank("запор", "Запор UpToDate")).toBeLessThan(
      titleRank("запор", "Хронический запор")
    );
  });

  it("отдельное слово выше, чем часть слова", () => {
    expect(titleRank("колит", "Язвенный колит")).toBeLessThan(
      titleRank("колит", "Проктоколит")
    );
  });

  // `\b` в JavaScript знает только латиницу: для кириллицы уровень «отдельное
  // слово» без ручной проверки границы был бы недостижим.
  it("видит границу слова в кириллице", () => {
    expect(titleRank("колит", "Язвенный колит")).toBe(2);
  });

  it("отдаёт худший ранг, когда запроса в заголовке нет", () => {
    expect(titleRank("отит", "Крапивница")).toBe(4);
  });

  it("не зависит от регистра", () => {
    expect(titleRank("СКОРАД", "скорад")).toBe(0);
  });

  it("не ломается на символах регулярных выражений", () => {
    expect(() => titleRank("(FPIES)", "Энтероколит (FPIES)")).not.toThrow();
    expect(titleRank("(FPIES)", "Энтероколит (FPIES)")).toBe(2);
  });
});

describe("orderByTitleRank", () => {
  it("сортирует по месту совпадения, затем по длине заголовка", () => {
    const items = [
      { title: "Младенческие колики UpToDate" },
      { title: "Колики" },
      { title: "Кишечные колики у детей" },
      { title: "Младенческие колики" },
    ];

    expect(orderByTitleRank("колики", items).map((item) => item.title)).toEqual([
      "Колики",
      "Младенческие колики",
      "Кишечные колики у детей",
      "Младенческие колики UpToDate",
    ]);
  });

  it("не меняет исходный массив", () => {
    const items = [{ title: "Б" }, { title: "А" }];
    orderByTitleRank("а", items);
    expect(items.map((item) => item.title)).toEqual(["Б", "А"]);
  });
});
