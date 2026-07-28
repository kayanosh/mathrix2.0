import * as Sentry from "@sentry/nextjs";

// Client-side runtime. See sentry.server.config.ts for the no-PII rationale
// — the same reasoning applies here: a pupil's browser session must not
// send their typed answers or uploaded content to an error tracker.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
    }
    return event;
  },
});
