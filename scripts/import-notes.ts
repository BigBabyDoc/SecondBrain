import "dotenv/config";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import {
  checksumOf,
  detectType,
  markdownFor,
  MAX_UPLOAD_BYTES,
  storageKeyFor,
  humanSize,
  isConvertibleToWebp,
  pickSmallerEncoding,
  type DetectedType,
  type EncodedAsset,
} from "../lib/media";
import { collectEmbeds, excerptFrom, obsidianToMarkdown, readAliases } from "../lib/obsidian";
import { slugify } from "../lib/slugify";
import { parseTags } from "../lib/tags";
import { mediaStorage } from "../lib/storage";
import type { Tier } from "../app/generated/prisma/client";

/**
 * Импорт хранилища Obsidian в каталог заметок:
 *
 *   npm run notes:import -- "Second brain data"
 *   npm run notes:import -- "Second brain data" --limit=50 --paid=half --skip-drafts
 *
 * Заметки сопоставляются по slug (он считается из заголовка), поэтому повторный
 * запуск обновляет уже загруженные, а не плодит копии. Путь папок становится
 * тегами, автором — первый администратор.
 *
 * Растровые вложения (PNG, JPEG) на лету пережимаются в WebP — это кратно
 * снижает исходящий трафик отдачи медиа. GIF (может быть анимированным) и PDF
 * не трогаем. Если WebP-версия не оказалась меньше оригинала, в хранилище
 * уходит оригинал — контрольная сумма и ключ хранения всегда считаются от тех
 * байт, которые реально загружены.
 *
 * Флаги:
 *   --limit=<n>      взять только первые n заметок (по алфавиту пути)
 *   --paid=none|half|all|"Название,Другое"  что закрыть подпиской (по умолчанию none)
 *   --skip-drafts    пропустить файлы с пометкой «Требует доработки»
 *   --prune          удалить ранее импортированные заметки, которых в наборе нет
 *   --dry-run        ничего не писать, только показать план
 */

const DRAFT_MARKER = /требует доработки/i;

type SourceNote = {
  title: string;
  slug: string;
  tags: string[];
  source: string;
  relativePath: string;
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const skipDrafts = args.includes("--skip-drafts");
  const prune = args.includes("--prune");
  const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice("--limit=".length) ?? 0);
  const paidArg = args.find((a) => a.startsWith("--paid="))?.slice("--paid=".length) ?? "none";
  const root = path.resolve(args.find((a) => !a.startsWith("--")) ?? "Second brain data");

  const files = await collectMarkdown(root);
  if (files.length === 0) {
    console.error(`✗ В «${root}» не найдено ни одного .md`);
    process.exit(1);
  }

  const attachments = await indexAttachments(root);
  const author = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  if (!author) {
    console.error("✗ Не найден пользователь с ролью ADMIN — некого назначить автором.");
    console.error("  Запустите `npx prisma db seed`.");
    process.exit(1);
  }

  const all: SourceNote[] = [];
  const taken = new Set<string>();
  let drafts = 0;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (skipDrafts && DRAFT_MARKER.test(source)) {
      drafts++;
      continue;
    }

    const relativePath = path.relative(root, file);
    const folder = path.dirname(relativePath);
    // macOS отдаёт имена файлов в NFD: «й» приходит как «и» + диакритика, из-за
    // чего slug получается кривым, а вики-ссылка (в тексте она в NFC) не находит
    // свою заметку. Нормализуем всё, что берём из файловой системы.
    const title = path.basename(file, ".md").normalize("NFC");
    const tags =
      folder === "." ? [] : parseTags(folder.split(path.sep).map((tag) => tag.normalize("NFC")));

    // Одинаковые заголовки в разных папках («БЭН» в гастроэнтерологии и в
    // неонатологии) дали бы один slug и затёрли друг друга при upsert. Различаем
    // их папкой, а не отметкой времени: slug должен быть тем же при повторе.
    let slug = slugify(title);
    if (taken.has(slug)) {
      slug = slugify(`${title} ${tags.at(-1) ?? ""}`);
      console.warn(`  ! «${title}» встречается дважды, второй адрес: /notes/${slug}`);
    }
    taken.add(slug);

    all.push({ title, slug, tags, source, relativePath });
  }

  const notes = limit > 0 ? all.slice(0, limit) : all;

  console.log(`Хранилище: ${root}`);
  console.log(`Файлов: ${files.length}, к загрузке: ${notes.length}${drafts ? `, черновиков пропущено: ${drafts}` : ""}`);
  console.log(`Вложений рядом: ${attachments.size}. Хранилище медиа: ${mediaStorage().kind}`);
  console.log(`Автор: ${author.email}${dryRun ? "\nРежим --dry-run: база и хранилище не меняются." : ""}\n`);

  // Карта строится до записи, иначе вики-ссылка на ещё не импортированную
  // заметку осталась бы обычным текстом из-за порядка файлов в папке.
  const slugByTitle = new Map(notes.map((note) => [note.title, note.slug]));
  const paidTitles = paidSelection(paidArg, notes);

  // Вложения заливаются до конвертации: она синхронная, а загрузка — нет.
  const uploads = new Map<string, string | null>();
  const webpStats = { converted: 0, bytesSaved: 0 };
  for (const name of new Set(notes.flatMap((note) => collectEmbeds(note.source)))) {
    const key = name.normalize("NFC");
    if (uploads.has(key)) continue;

    uploads.set(
      key,
      dryRun
        ? attachments.has(key)
          ? `![${key}](/api/media/…)`
          : null
        : await uploadAttachment(attachments.get(key), key, author.id, webpStats)
    );
  }

  const droppedEmbeds: string[] = [];
  const unresolvedLinks: string[] = [];

  for (const note of notes) {
    const final = obsidianToMarkdown(
      note.source,
      (target) => slugByTitle.get(target.normalize("NFC")) ?? null,
      (name) => uploads.get(name.normalize("NFC")) ?? null
    );

    droppedEmbeds.push(...final.droppedEmbeds);
    unresolvedLinks.push(...final.unresolvedLinks);

    const tier: Tier = paidTitles.has(note.title) ? "PAID" : "FREE";
    // У оглавления раздела своего текста нет — тогда описанием служит алиас из
    // фронтматтера, а на самый крайний случай остаётся название папки.
    const excerpt =
      excerptFrom(final.content) ||
      readAliases(note.source)[0] ||
      `Материалы раздела «${note.tags.at(-1) ?? "Заметки"}».`;

    if (!dryRun) {
      await prisma.note.upsert({
        where: { slug: note.slug },
        update: {
          title: note.title,
          excerpt,
          content: final.content,
          tier,
          tags: note.tags,
        },
        create: {
          slug: note.slug,
          title: note.title,
          excerpt,
          content: final.content,
          tier,
          tags: note.tags,
          published: true,
          authorId: author.id,
        },
      });
    }

    const images = final.content.match(/!\[[^\]]*\]\(\/api\/media\//g)?.length ?? 0;
    console.log(
      `  ${tier === "PAID" ? "🔒" : "  "} ${note.title.padEnd(44).slice(0, 44)} ` +
        `${images ? `🖼 ${images}` : "   "}  /notes/${note.slug}`
    );
  }

  const attached = [...uploads.values()].filter(Boolean).length;
  console.log(`\nВложения: перенесено ${attached} из ${uploads.size}.`);
  if (webpStats.converted > 0) {
    console.log(`Пережато в WebP: ${webpStats.converted}, экономия ${humanSize(webpStats.bytesSaved)}.`);
  }

  const lostEmbeds = [...new Set(droppedEmbeds)];
  if (lostEmbeds.length > 0) {
    console.log(`\nВложения (${lostEmbeds.length}) не перенесены — файла нет или формат не поддержан:`);
    for (const name of lostEmbeds.slice(0, 15)) console.log(`  - ${name}`);
    if (lostEmbeds.length > 15) console.log(`  … и ещё ${lostEmbeds.length - 15}`);
  }

  const unresolved = [...new Set(unresolvedLinks)];
  if (unresolved.length > 0) {
    console.log(`\nСсылки на незагруженные заметки (${unresolved.length}) стали простым текстом:`);
    for (const name of unresolved.slice(0, 15)) console.log(`  - ${name}`);
    if (unresolved.length > 15) console.log(`  … и ещё ${unresolved.length - 15}`);
  }

  if (prune) {
    // Импортированную заметку узнаём по первому тегу — это корневая папка
    // хранилища. Служебной пометки для этого не заводим: теги видны читателю в
    // облаке фильтров, и «obsidian» среди них выглядел бы мусором.
    const rootTags = new Set(all.map((note) => note.tags[0]).filter(Boolean));
    const keep = notes.map((note) => note.slug);
    const candidates = await prisma.note.findMany({
      where: { slug: { notIn: keep } },
      select: { slug: true, title: true, tags: true },
    });
    const stale = candidates.filter((note) => note.tags[0] && rootTags.has(note.tags[0]));

    if (stale.length > 0) {
      console.log(`\nУдаляю ранее импортированные, которых нет в наборе (${stale.length}):`);
      for (const note of stale) console.log(`  - ${note.title}`);
      if (!dryRun) {
        await prisma.note.deleteMany({ where: { slug: { in: stale.map((n) => n.slug) } } });
      }
    }
  }
}

/**
 * Половина закрывается через одну — так платные и бесплатные оказываются во
 * всех разделах сразу, а не одним куском каталога.
 */
function paidSelection(arg: string, notes: SourceNote[]): Set<string> {
  if (arg === "all") return new Set(notes.map((note) => note.title));
  if (arg === "half") return new Set(notes.filter((_, index) => index % 2 === 1).map((n) => n.title));
  if (arg === "none" || arg === "") return new Set();

  return new Set(
    arg
      .split(",")
      .map((title) => title.trim())
      .filter(Boolean)
  );
}

/**
 * Пережимает PNG/JPEG в WebP, если это реально экономит место — решает
 * pickSmallerEncoding (lib/media.ts), а этой функции остаётся только вызвать
 * sharp и оформить результат в тот же вид, что и оригинал.
 */
async function encodeForStorage(detected: DetectedType, bytes: Buffer, name: string): Promise<EncodedAsset> {
  const original: EncodedAsset = { contentType: detected.contentType, extension: detected.extension, bytes };
  if (!isConvertibleToWebp(detected.contentType)) return original;

  try {
    const webpBytes = await sharp(bytes).webp({ quality: 82 }).toBuffer();
    return pickSmallerEncoding(original, { contentType: "image/webp", extension: "webp", bytes: webpBytes });
  } catch (error) {
    console.warn(`     ! ${name}: не удалось пережать в WebP (${(error as Error).message}), оставляю оригинал`);
    return original;
  }
}

/**
 * Вложение проходит тот же путь, что и загрузка через /admin: тип по магическим
 * байтам, ключ хранения — sha256 содержимого. Повторный запуск и повторяющаяся
 * во многих заметках картинка дают один медиаобъект, а не копии. Контрольная
 * сумма и ключ хранения считаются уже от пережатых байт — контентная адресация
 * должна отражать то, что реально легло в хранилище.
 */
async function uploadAttachment(
  file: string | undefined,
  name: string,
  uploadedById: string,
  webpStats: { converted: number; bytesSaved: number }
): Promise<string | null> {
  if (!file) return null;

  const info = await stat(file);
  if (info.size > MAX_UPLOAD_BYTES) {
    console.warn(`     ! ${name}: ${humanSize(info.size)} — больше лимита ${humanSize(MAX_UPLOAD_BYTES)}`);
    return null;
  }

  const original = await readFile(file);
  const detected = detectType(original);
  if (!detected) {
    console.warn(`     ! ${name}: формат не поддерживается`);
    return null;
  }

  const encoded = await encodeForStorage(detected, original, name);
  if (encoded.contentType !== detected.contentType) {
    webpStats.converted++;
    webpStats.bytesSaved += original.byteLength - encoded.bytes.byteLength;
  }
  const bytes = encoded.bytes;

  const checksum = checksumOf(bytes);
  const existing = await prisma.mediaObject.findUnique({ where: { checksum } });
  if (existing) return markdownFor(detected.kind, existing.id, existing.originalName);

  const storageKey = storageKeyFor(checksum, encoded.extension);
  await mediaStorage().put(storageKey, Buffer.from(bytes), encoded.contentType);

  const media = await prisma.mediaObject.create({
    data: {
      checksum,
      contentType: encoded.contentType,
      sizeBytes: bytes.byteLength,
      storageKey,
      originalName: name,
      uploadedById,
    },
  });

  return markdownFor(detected.kind, media.id, name);
}

/** Имя файла → путь. Obsidian ссылается на вложения по имени, без папки. */
async function indexAttachments(dir: string): Promise<Map<string, string>> {
  const index = new Map<string, string>();

  const walk = async (current: string) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) await walk(full);
      else if (!entry.name.endsWith(".md")) index.set(entry.name.normalize("NFC"), full);
    }
  };

  await walk(dir);
  return index;
}

async function collectMarkdown(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) files.push(...(await collectMarkdown(full)));
    else if (entry.name.endsWith(".md")) files.push(full);
  }

  return files.sort();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
