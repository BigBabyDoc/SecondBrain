import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Инкремент счётчика открытий заметки.
 *
 * Эндпоинт публичный: каталог и страницы заметок открыты анонимным читателям,
 * и просмотр закрытой заметки — такой же просмотр, как открытой. Записывается
 * ровно одно число, никаких данных о посетителе здесь не появляется, поэтому
 * согласия на аналитику этот счётчик не требует.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // updateMany, а не update: несуществующий слаг не должен приводить к ошибке.
  // Условие published отсекает черновики — их «просмотры» это правки автора.
  const result = await prisma.note.updateMany({
    where: { slug, published: true },
    data: { views: { increment: 1 } },
  });

  return NextResponse.json({ ok: result.count > 0 });
}
