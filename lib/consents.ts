import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "@/lib/legal";

export type ConsentType =
  | "TERMS"
  | "PERSONAL_DATA"
  | "PROFESSIONAL_STATUS"
  | "MARKETING"
  | "AUTO_RENEWAL";

/** Какой документ описывает каждое согласие — от него берётся версия для журнала. */
const CONSENT_DOCUMENT: Record<ConsentType, LegalDocumentKey> = {
  TERMS: "terms",
  PERSONAL_DATA: "consents",
  PROFESSIONAL_STATUS: "terms",
  MARKETING: "consents",
  AUTO_RENEWAL: "consents",
};

/**
 * IP берётся из заголовков прокси: приложение слушает localhost, и без
 * X-Forwarded-For в журнале оказался бы адрес самого сервера.
 */
export async function requestIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headerList.get("x-real-ip");
}

export function consentVersion(type: ConsentType): string {
  return LEGAL_DOCUMENTS[CONSENT_DOCUMENT[type]].version;
}

/** Записывает предоставление согласия с датой, временем, IP и версией документа. */
export async function grantConsent(params: {
  userId: string;
  type: ConsentType;
  ip: string | null;
}): Promise<void> {
  await prisma.consent.create({
    data: {
      userId: params.userId,
      type: params.type,
      version: consentVersion(params.type),
      grantedIp: params.ip,
    },
  });
}

/**
 * Отзыв не удаляет запись: она подтверждает, что согласие было, и хранится
 * положенный срок. Отмечается только факт и обстоятельства отзыва.
 */
export async function revokeConsent(params: {
  userId: string;
  type: ConsentType;
  ip: string | null;
}): Promise<void> {
  await prisma.consent.updateMany({
    where: { userId: params.userId, type: params.type, revokedAt: null },
    data: { revokedAt: new Date(), revokedIp: params.ip },
  });
}

export async function hasActiveConsent(
  userId: string,
  type: ConsentType
): Promise<boolean> {
  const consent = await prisma.consent.findFirst({
    where: { userId, type, revokedAt: null },
  });
  return consent !== null;
}
