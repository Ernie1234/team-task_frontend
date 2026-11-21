import type { ReactNode } from "react";
import { Sentry } from "@/lib/sentry";
import { Button } from "@/components/ui/button";

/** Last line of defence: a crash shows a way out instead of a blank page */
function CrashScreen({ eventId, resetError }: { eventId: string; resetError: () => void }) {
  return (
    <div role="alert" className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page hit an error and couldn't continue. Reloading usually fixes it.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>Reload the page</Button>
        <Button
          variant="outline"
          onClick={() => {
            resetError();
            window.location.assign("/");
          }}
        >
          Go to my workspace
        </Button>
      </div>
      {eventId && <p className="text-xs text-muted-foreground">Error reference: {eventId.slice(0, 8)}</p>}
    </div>
  );
}

export default function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={({ eventId, resetError }) => <CrashScreen eventId={eventId} resetError={resetError} />}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
