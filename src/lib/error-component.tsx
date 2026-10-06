import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert, RefreshCw } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    // Nitro / TanStack Start unhandled server errors often arrive as
    // {"status":500,"unhandled":true,"message":"HTTPError"} or a plain
    // "HTTPError". Surface something human instead of the raw blob.
    const msg = error.message.trim();
    if (
      msg === "HTTPError" ||
      msg.includes('"unhandled":true') ||
      msg.includes('"status":500')
    ) {
      return "The desk had a momentary hiccup talking to the server. Reload and you should be back in.";
    }
    if (msg === "Unauthorized") {
      return "Your session expired. Sign in again to continue.";
    }
    return msg;
  }
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <span className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive" aria-hidden="true">
        <TriangleAlert className="size-6" strokeWidth={2} />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-xl tracking-tight italic">Something went wrong</h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground break-words">
          {errorMessage(error)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
      >
        <RefreshCw className="size-3.5" />
        Reload Helix
      </button>
      <p className="text-[11px] text-muted-foreground">Helix 2.1 · desk + portal</p>
    </main>
  );
}
