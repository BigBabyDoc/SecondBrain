import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENTS, OPERATOR, PROCESSORS } from "@/lib/legal";
import { isValidChoice, COOKIE_CONSENT_DAYS } from "@/lib/cookie-consent";

describe("реквизиты оператора", () => {
  it("ИНН состоит из 12 цифр (физлицо)", () => {
    expect(OPERATOR.inn).toMatch(/^\d{12}$/);
  });

  it("email оператора заполнен", () => {
    expect(OPERATOR.email).toContain("@");
  });
});

describe("юридические документы", () => {
  it("у каждого документа есть адрес, заголовок и версия", () => {
    for (const doc of Object.values(LEGAL_DOCUMENTS)) {
      expect(doc.href.startsWith("/")).toBe(true);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.version.length).toBeGreaterThan(0);
    }
  });

  it("адреса страниц не повторяются", () => {
    const hrefs = Object.values(LEGAL_DOCUMENTS).map((d) => d.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("ключ документа совпадает с полем key", () => {
    for (const [key, doc] of Object.entries(LEGAL_DOCUMENTS)) {
      expect(doc.key).toBe(key);
    }
  });
});

describe("обработчики персональных данных", () => {
  it("у каждого указаны название, адрес, цель и состав данных", () => {
    for (const processor of PROCESSORS) {
      expect(processor.name.length).toBeGreaterThan(0);
      expect(processor.address.length).toBeGreaterThan(0);
      expect(processor.purpose.length).toBeGreaterThan(0);
      expect(processor.data.length).toBeGreaterThan(0);
    }
  });
});

describe("выбор по файлам cookie", () => {
  it("принимает только два известных значения", () => {
    expect(isValidChoice("all")).toBe(true);
    expect(isValidChoice("necessary")).toBe(true);
    expect(isValidChoice("analytics")).toBe(false);
    expect(isValidChoice(undefined)).toBe(false);
  });

  it("срок согласия — 6 месяцев, как указано в политике", () => {
    expect(COOKIE_CONSENT_DAYS).toBe(180);
  });
});
