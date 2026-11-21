import * as Sentry from "@sentry/react";

/*
 * Error tracking for the web app. Off unless VITE_SENTRY_DSN is set.
 * Imported first in main.tsx.
 */

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
export const sentryEnabled = Boolean(dsn);

const apiOrigin = (() => {
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
})();

if (sentryEnabled) {
  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || import.meta.env.MODE,
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) || undefined,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Link slow pages to the API requests behind them
    tracePropagationTargets: [apiOrigin],
    sendDefaultPii: false,
    // Noise from browser extensions and dropped connections
    ignoreErrors: ["ResizeObserver loop", "Network Error", "Request aborted", "Failed to fetch"],
  });
}

/** Errors are tagged with the account id only (no name or email) */
export const setErrorReportingUser = (userId: string | null) => {
  if (sentryEnabled) Sentry.setUser(userId ? { id: userId } : null);
};

export { Sentry };
