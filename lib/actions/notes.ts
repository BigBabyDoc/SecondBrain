"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Недостаточно прав");
  }
  return session.user;
}

const noteSchema = z.object({
  title: z.string().min(3, "Заголовок слишком короткий"),
  excerpt: z.string().min(3, "Добавьте краткое описание"),
  content: z.string().min(10, "Текст заметки слишком короткий"),
  tier: z.enum(["FREE", "BASIC", "PRO"]),
  tags: z.string(),
  published: z.string().optional(),
});

export type NoteFormState = { error?: string };

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

export async function createNoteAction(
  _prevState: NoteFormState,
  formData: FormData
): Promise<NoteFormState> {
  const admin = await requireAdmin();

  const parsed = noteSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    tier: formData.get("tier"),
    tags: formData.get("tags") ?? "",
    published: formData.get("published") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" };
  }

  const { title, excerpt, content, tier, tags, published } = parsed.data;

  let slug = slugify(title);
  const existing = await prisma.note.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const note = await prisma.note.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      tier,
      tags: parseTags(tags),
      published: published === "on",
      authorId: admin.id,
    },
  });

  revalidatePath("/notes");
  revalidatePath("/admin/notes");
  redirect(`/admin/notes/${note.id}/edit`);
}

export async function updateNoteAction(
  noteId: string,
  _prevState: NoteFormState,
  formData: FormData
): Promise<NoteFormState> {
  await requireAdmin();

  const parsed = noteSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    tier: formData.get("tier"),
    tags: formData.get("tags") ?? "",
    published: formData.get("published") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" };
  }

  const { title, excerpt, content, tier, tags, published } = parsed.data;

  await prisma.note.update({
    where: { id: noteId },
    data: {
      title,
      excerpt,
      content,
      tier,
      tags: parseTags(tags),
      published: published === "on",
    },
  });

  revalidatePath("/notes");
  revalidatePath(`/notes/${noteId}`);
  revalidatePath("/admin/notes");

  return {};
}

export async function deleteNoteAction(noteId: string) {
  await requireAdmin();
  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath("/notes");
  revalidatePath("/admin/notes");
  redirect("/admin/notes");
}
