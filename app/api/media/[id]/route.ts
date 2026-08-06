import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaStorage } from "@/lib/storage";

/**
 * Раздача файла. Отдаём байты сами, а не редиректим на presigned-ссылку:
 * так адрес файла не зависит от хранилища и не протухает, а переезд с локальной
 * папки на S3 не меняет ссылки внутри уже написанных заметок.
 *
 * Файлы адресуются по содержимому и не меняются, поэтому кэшируются навсегда.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const media = await prisma.mediaObject.findUnique({ where: { id } });
  if (!media) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const bytes = await mediaStorage().get(media.storageKey);
  if (!bytes) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.sizeBytes),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Картинки показываем в браузере, PDF тоже открываем, не скачиваем принудительно.
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(media.originalName)}`,
    },
  });
}
