import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";

/**
 * Байты файлов лежат либо в S3-совместимом хранилище (в проде — Yandex Object
 * Storage), либо в локальной папке. Выбор — по наличию переменных окружения,
 * как это уже сделано с почтой в lib/mail.ts: настроено — работаем по-боевому,
 * не настроено — локально, чтобы разработка и тесты не требовали облака.
 */
export type MediaStorage = {
  readonly kind: "s3" | "local";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
};

function s3Config() {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint: process.env.S3_ENDPOINT || "https://storage.yandexcloud.net",
    region: process.env.S3_REGION || "ru-central1",
  };
}

function localDir() {
  return resolve(process.env.MEDIA_LOCAL_DIR || ".media");
}

function createLocalStorage(): MediaStorage {
  return {
    kind: "local",
    async put(key, body) {
      const path = join(localDir(), key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
    },
    async get(key) {
      try {
        return await readFile(join(localDir(), key));
      } catch {
        return null;
      }
    },
  };
}

function createS3Storage(config: NonNullable<ReturnType<typeof s3Config>>): MediaStorage {
  // Клиент создаётся лениво и один раз: конструктор тянет тяжёлые зависимости,
  // а на страницах без медиа они не нужны.
  let clientPromise: Promise<import("@aws-sdk/client-s3").S3Client> | null = null;

  const client = async () => {
    if (!clientPromise) {
      clientPromise = import("@aws-sdk/client-s3").then(
        ({ S3Client }) =>
          new S3Client({
            endpoint: config.endpoint,
            region: config.region,
            forcePathStyle: true,
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          })
      );
    }
    return clientPromise;
  };

  return {
    kind: "s3",
    async put(key, body, contentType) {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      await (
        await client()
      ).send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
    },
    async get(key) {
      const { GetObjectCommand, NoSuchKey } = await import("@aws-sdk/client-s3");
      try {
        const response = await (
          await client()
        ).send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
        if (!response.Body) return null;
        return Buffer.from(await response.Body.transformToByteArray());
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        throw error;
      }
    },
  };
}

let cached: MediaStorage | null = null;

export function mediaStorage(): MediaStorage {
  if (!cached) {
    const config = s3Config();
    cached = config ? createS3Storage(config) : createLocalStorage();
  }
  return cached;
}
