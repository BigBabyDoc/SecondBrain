import { describe, expect, it } from "vitest";
import {
  checksumOf,
  detectType,
  markdownFor,
  storageKeyFor,
} from "@/lib/media";

const bytesOf = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

const PNG = bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPEG = bytesOf(0xff, 0xd8, 0xff, 0xe0);
const GIF = bytesOf(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
const PDF = bytesOf(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x00, 0x00, 0x00, 0x00, // размер
  0x57, 0x45, 0x42, 0x50, // WEBP
  0x00, 0x00, 0x00, 0x00,
]);

describe("detectType", () => {
  it("узнаёт поддерживаемые форматы по сигнатуре", () => {
    expect(detectType(PNG)?.contentType).toBe("image/png");
    expect(detectType(JPEG)?.contentType).toBe("image/jpeg");
    expect(detectType(GIF)?.contentType).toBe("image/gif");
    expect(detectType(WEBP)?.contentType).toBe("image/webp");
    expect(detectType(PDF)?.contentType).toBe("application/pdf");
  });

  it("различает картинки и документы", () => {
    expect(detectType(PNG)?.kind).toBe("image");
    expect(detectType(PDF)?.kind).toBe("pdf");
  });

  it("отклоняет неизвестное содержимое", () => {
    expect(detectType(bytesOf(0x00, 0x01, 0x02, 0x03))).toBeNull();
  });

  it("не верит расширению: переименованный в .png исполняемый файл не пройдёт", () => {
    // MZ — заголовок исполняемого файла Windows.
    expect(detectType(bytesOf(0x4d, 0x5a, 0x90, 0x00))).toBeNull();
  });

  it("RIFF без метки WEBP не считается картинкой (например, WAV)", () => {
    const wav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, 0x00, 0x00, 0x00, 0x00,
    ]);
    expect(detectType(wav)).toBeNull();
  });
});

describe("checksumOf", () => {
  it("одинаковые байты дают одинаковый хеш — на этом держится дедупликация", () => {
    expect(checksumOf(PNG)).toBe(checksumOf(new Uint8Array(PNG)));
  });

  it("разные байты дают разный хеш", () => {
    expect(checksumOf(PNG)).not.toBe(checksumOf(JPEG));
  });
});

describe("storageKeyFor", () => {
  it("раскладывает файлы по префиксу, чтобы не держать всё в одной папке", () => {
    expect(storageKeyFor("abcdef123456", "png")).toBe("ab/abcdef123456.png");
  });
});

describe("markdownFor", () => {
  it("картинку вставляет как изображение", () => {
    expect(markdownFor("image", "m1", "схема.png")).toBe("![схема.png](/api/media/m1)");
  });

  it("PDF вставляет ссылкой", () => {
    expect(markdownFor("pdf", "m2", "клинрек.pdf")).toBe("[клинрек.pdf](/api/media/m2)");
  });

  it("экранирует скобки в имени, чтобы не разваливалась разметка", () => {
    expect(markdownFor("image", "m3", "схема [2].png")).toBe("![схема 2.png](/api/media/m3)");
  });
});
