import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { sentryOptions, serverDsn } from "@/lib/sentry-options";

export async function register() {
  const dsn = serverDsn();
  if (!dsn) return;

  // Node и edge-рантайм инициализируются одинаково, различается только окружение.
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({ dsn, ...sentryOptions });
  }
}

export const onRequestError: Instrumentation.onRequestError = (...args) => {
  if (!serverDsn()) return;
  Sentry.captureRequestError(...args);
};
