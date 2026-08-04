import * as Sentry from "@sentry/nextjs";
import { clientDsn, sentryOptions } from "@/lib/sentry-options";

const dsn = clientDsn();
if (dsn) {
  Sentry.init({ dsn, ...sentryOptions });
}

export const onRouterTransitionStart = dsn
  ? Sentry.captureRouterTransitionStart
  : () => {};
