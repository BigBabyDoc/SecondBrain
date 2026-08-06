import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_UPLOAD_BYTES,
  checksumOf,
  detectType,
  humanSize,
  markdownFor,
  storageKeyFor,
} from "@/lib/media";
import { mediaStorage } from "@/lib/storage";

/**
 * Загрузка файла из админки. Роут-обработчик, а не server action: клиенту нужен
 * ответ с готовой markdown-разметкой, чтобы сразу вставить её в текст заметки.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Файл больше ${humanSize(MAX_UPLOAD_BYTES)}` },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = detectType(bytes);
  if (!detected) {
    return NextResponse.json(
      { error: "Поддерживаются только PNG, JPEG, WebP, GIF и PDF" },
      { status: 415 }
    );
  }

  const checksum = checksumOf(bytes);
  const originalName = file.name || `file.${detected.extension}`;

  // Тот же файл уже загружали — переиспользуем объект, повторно не пишем.
  const existing = await prisma.mediaObject.findUnique({ where: { checksum } });
  if (existing) {
    return NextResponse.json({
      id: existing.id,
      markdown: markdownFor(detected.kind, existing.id, existing.originalName),
      deduplicated: true,
    });
  }

  const storageKey = storageKeyFor(checksum, detected.extension);
  await mediaStorage().put(storageKey, bytes, detected.contentType);

  const media = await prisma.mediaObject.create({
    data: {
      checksum,
      contentType: detected.contentType,
      sizeBytes: bytes.byteLength,
      storageKey,
      originalName,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json({
    id: media.id,
    markdown: markdownFor(detected.kind, media.id, originalName),
    deduplicated: false,
  });
}
