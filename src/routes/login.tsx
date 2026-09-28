import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { HelixWordmark } from "@/components/helix-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"staff" | "client">("staff");
  const [emailMode, setEmailMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) return <div className="min-h-dvh bg-background" />;
  if (user) return <Navigate to={mode === "client" ? "/portal" : "/desk"} />;

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    sessionStorage.setItem("helix.intent", mode);
    if (mode === "client") {
      sessionStorage.setItem("helix.joinCode", joinCode.trim().toUpperCase());
      sessionStorage.setItem("helix.company", company.trim());
    } else {
      sessionStorage.removeItem("helix.joinCode");
      if (company.trim()) sessionStorage.setItem("helix.company", company.trim());
    }
    try {
      if (!authEnabled) throw new Error("Sign-in is disabled.");
      if (emailMode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name || email,
        });
        if (err) throw new Error(err.message ?? "Could not create account");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message ?? "Could not sign in");
      }
      window.location.href = mode === "client" ? "/portal" : "/desk";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex">
          <HelixWordmark />
        </Link>
        <h1 className="font-display text-3xl tracking-tight italic">
          {mode === "staff" ? "Open the desk." : "Enter as a client."}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "staff"
            ? "Management portal for your IT team."
            : "Use the desk code your provider shared."}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("staff")}
            className={`h-9 rounded-md text-sm ${mode === "staff" ? "bg-card text-foreground" : "text-muted-foreground"}`}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => setMode("client")}
            className={`h-9 rounded-md text-sm ${mode === "client" ? "bg-card text-foreground" : "text-muted-foreground"}`}
          >
            Client
          </button>
        </div>

        <div className="mt-6 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  sessionStorage.setItem("helix.intent", mode);
                  if (mode === "client") {
                    sessionStorage.setItem("helix.joinCode", joinCode.trim().toUpperCase());
                    sessionStorage.setItem("helix.company", company.trim());
                  }
                  void signIn(p.providerId, {
                    callbackURL: mode === "client" ? "/portal" : "/desk",
                  });
                }}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sign-in is disabled.</p>
          )}
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-3" onSubmit={onEmail}>
          {emailMode === "up" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          {(mode === "staff" && emailMode === "up") || mode === "client" ? (
            <div className="space-y-1.5">
              <Label htmlFor="company">{mode === "client" ? "Your company" : "Desk name"}</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={mode === "staff" ? "Northline IT" : "Meridian Legal"}
              />
            </div>
          ) : null}
          {mode === "client" && (
            <div className="space-y-1.5">
              <Label htmlFor="code">Desk code</Label>
              <Input
                id="code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. K7M2QH"
                className="font-mono uppercase"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={emailMode === "up" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : emailMode === "up" ? "Create account" : "Sign in with email"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setEmailMode(emailMode === "up" ? "in" : "up")}
        >
          {emailMode === "up" ? "Have an account? Sign in" : "Need an account? Create one"}
        </button>
      </div>
    </main>
  );
}
