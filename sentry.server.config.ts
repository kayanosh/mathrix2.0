import * as Sentry from "@sentry/nextjs";

/**
 * DEF-006: no-op with no DSN (Sentry's own SDK behaviour — confirmed no
 * account/DSN exists for this project as of this pass). When a DSN is added
 * later, this file activates automatically; nothing else needs to change.
 *
 * sendDefaultPii is explicitly false and request bodies are dropped in
 * beforeSend — MATHRIX_SECURITY_PRIVACY_REPORT.md requires pupil answers,
 * voice recordings, and uploaded documents to never be logged without a
 * defined purpose and retention policy, and a default Sentry config would
 * violate that on the first error in a route like /api/chat or
 * /api/ks2-lesson (both take pupil-authored or pupil-facing text as input).
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
