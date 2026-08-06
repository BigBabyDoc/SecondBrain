import { createHash } from "crypto";

/** Больше 10 МБ не принимаем: заметки — это текст со схемами, а не файлохранилище. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type MediaKind = "image" | "pdf";

type Signature = {
  contentType: string;
  kind: MediaKind;
  extension: string;
  matches: (bytes: Uint8Array) => boolean;
};

const startsWith = (bytes: Uint8Array, prefix: number[], offset = 0) =>
  prefix.every((byte, i) => bytes[offset + i] === byte);

/**
 * Тип определяем по сигнатуре файла, а не по заголовку от клиента: заявленный
 * content-type подделывается тривиально, а мы по нему отдаём файл обратно в браузер.
 */
const SIGNATURES: Signature[] = [
  {
    contentType: "image/png",
    kind: "image",
    extension: "png",
    matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    contentType: "image/jpeg",
    kind: "image",
    extension: "jpg",
    matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  },
  {
    contentType: "image/gif",
    kind: "image",
    extension: "gif",
    matches: (b) => startsWith(b, [0x47, 0x49, 0x46, 0x38]),
  },
  {
    contentType: "image/webp",
    kind: "image",
    extension: "webp",
    // RIFF....WEBP — четыре байта размера между сигнатурами.
    matches: (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  },
  {
    contentType: "application/pdf",
    kind: "pdf",
    extension: "pdf",
    matches: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
  },
];

export type DetectedType = Omit<Signature, "matches">;

export function detectType(bytes: Uint8Array): DetectedType | null {
  const found = SIGNATURES.find((signature) => signature.matches(bytes));
  if (!found) return null;
  const { contentType, kind, extension } = found;
  return { contentType, kind, extension };
}

export function checksumOf(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Ключ хранения — сам хеш: одинаковые байты всегда дают один объект. */
export function storageKeyFor(checksum: string, extension: string): string {
  return `${checksum.slice(0, 2)}/${checksum}.${extension}`;
}

/** Разметка для вставки в текст заметки: картинка показывается, PDF — ссылкой. */
export function markdownFor(kind: MediaKind, id: string, name: string): string {
  const url = `/api/media/${id}`;
  const safeName = name.replace(/[[\]]/g, "");
  return kind === "image" ? `![${safeName}](${url})` : `[${safeName}](${url})`;
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
