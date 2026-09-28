import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { bootstrapDesk } from "@/lib/desk/server";
import type { Actor } from "@/lib/desk/types";
import { Skeleton } from "@/components/ui/skeleton";


export function WorkspaceGate({
  children,
  expect,
}: {
  children: (actor: Actor) => ReactNode;
  expect?: "staff" | "client";
}) {
  const { user, isPending } = useCurrentUserState();
  const [actor, setActor] = useState<Actor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending || !user) return;
    let cancelled = false;
    const intent = sessionStorage.getItem("helix.intent") as "staff" | "client" | null;
    const joinCode = sessionStorage.getItem("helix.joinCode") ?? undefined;
    const company = sessionStorage.getItem("helix.company") ?? undefined;
    void bootstrapDesk({
      data: {
        displayName: user.displayName ?? user.primaryEmail ?? "You",
        email: user.primaryEmail ?? undefined,
        intent: intent ?? "staff",
        joinCode,
        company,
      },
    })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setActor(res.actor);
      })
      .catch(() => {
        if (!cancelled) setError("Could not open your desk.");
      });
    return () => {
      cancelled = true;
    };
  }, [isPending, user]);

  if (isPending) return <ShellSkeleton />;
  if (!user) return <RedirectToSignIn />;
  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }
  if (!actor) return <ShellSkeleton />;
  if (expect && actor.kind !== expect && !(expect === "client" && actor.kind === "staff")) {
    // staff may preview client portal; clients cannot enter staff desk
    if (expect === "staff" && actor.kind === "client") {
      return <Navigate to="/portal" />;
    }
  }
  return <>{children(actor)}</>;
}

export function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-background">
      <div className="hidden w-60 border-r border-border p-4 md:block">
        <Skeleton className="mb-6 h-8 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </div>
  );
}
