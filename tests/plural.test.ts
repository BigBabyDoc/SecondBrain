import { describe, expect, it } from "vitest";
import { DAYS, VIEWS, plural } from "@/lib/plural";

describe("plural", () => {
  it("склоняет по последней цифре", () => {
    expect(plural(1, DAYS)).toBe("день");
    expect(plural(2, DAYS)).toBe("дня");
    expect(plural(5, DAYS)).toBe("дней");
    expect(plural(21, DAYS)).toBe("день");
    expect(plural(34, DAYS)).toBe("дня");
  });

  it("одиннадцать-четырнадцать — исключение", () => {
    // Оканчиваются на 1-4, но требуют форму «дней».
    expect(plural(11, DAYS)).toBe("дней");
    expect(plural(12, DAYS)).toBe("дней");
    expect(plural(13, DAYS)).toBe("дней");
    expect(plural(14, DAYS)).toBe("дней");
    expect(plural(111, DAYS)).toBe("дней");
  });

  it("ноль берёт форму множественного числа", () => {
    expect(plural(0, VIEWS)).toBe("просмотров");
  });

  it("работает с любым набором форм", () => {
    expect(plural(101, VIEWS)).toBe("просмотр");
    expect(plural(102, VIEWS)).toBe("просмотра");
    expect(plural(105, VIEWS)).toBe("просмотров");
  });
});
