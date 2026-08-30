import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

/**
 * Выдаёт роль ADMIN. Административной страницы для назначения ролей нет
 * намеренно — первый администратор появляется до того, как в интерфейс есть
 * кому зайти, — поэтому повышение делается из консоли сервера:
 *
 *   npm run admin:grant -- a@mail.ru b@mail.ru
 *   npm run admin:grant -- --dry-run a@mail.ru
 *   ADMIN_PASSWORD=... npm run admin:grant -- --create --name="Имя" a@mail.ru
 *
 * Обычный путь — человек регистрируется на сайте сам, а скрипт только меняет
 * роль: тогда пароль знает только он, а согласия (оферта, персональные данные,
 * профессиональный статус) записаны так же, как у всех остальных. Флаг
 * `--create` заводит недостающего пользователя и нужен, когда регистрация
 * почему-то недоступна; согласий у такой записи не будет, их придётся принять
 * при первом входе.
 *
 * Email приводится к нижнему регистру, потому что `registerAction` хранит его
 * так же — иначе «Valeriy@mail.ru» не найдёт «valeriy@mail.ru».
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const create = process.argv.includes("--create");
  const name = argValue("name");

  const emails = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith("--"))
    .map((email) => email.toLowerCase());

  if (emails.length === 0) {
    throw new Error("Укажите хотя бы один email: npm run admin:grant -- user@mail.ru");
  }

  const password = process.env.ADMIN_PASSWORD;
  if (create && (!password || password.length < 8)) {
    throw new Error(
      "Для --create задайте ADMIN_PASSWORD (не короче 8 символов) в переменной окружения, " +
        "а не в аргументах — аргументы видны в истории командной строки и в списке процессов."
    );
  }

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      if (!create) {
        console.log(`${email}: не найден — пусть зарегистрируется на сайте, затем повторите`);
        continue;
      }
      if (dryRun) {
        console.log(`${email}: будет создан как ADMIN`);
        continue;
      }
      await prisma.user.create({
        data: {
          email,
          name: name ?? email.split("@")[0],
          role: "ADMIN",
          passwordHash: await bcrypt.hash(password!, 10),
          // Ящик заводит владелец сервиса, письмо подтверждения было бы
          // формальностью, а без отметки закрыта оплата.
          emailVerified: new Date(),
          subscription: { create: { tier: "FREE", status: "ACTIVE" } },
        },
      });
      console.log(`${email}: создан, роль ADMIN`);
      continue;
    }

    if (user.role === "ADMIN") {
      console.log(`${email}: уже ADMIN`);
      continue;
    }

    if (dryRun) {
      console.log(`${email}: ${user.role} → ADMIN`);
      continue;
    }

    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    console.log(`${email}: ${user.role} → ADMIN`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
