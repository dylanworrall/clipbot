"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, UserPlus, LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const session = authClient.useSession();

  // Already logged in — full reload so cookie is sent
  if (session.data?.user) {
    window.location.href = callbackUrl;
    return null;
  }

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (result.error) {
          setError(result.error.message || "Sign up failed");
          return;
        }
        // Provision 50 free credits in Convex
        await fetch("/api/credits", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, name: name || email.split("@")[0] }),
        });
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) {
          setError(result.error.message || "Sign in failed");
          return;
        }
      }
      // Full reload so the session cookie is sent with the next request
      window.location.href = callbackUrl;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-light tracking-tight text-foreground/80">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "signin"
              ? "Sign in to your ClipBot account"
              : "Start creating viral clips with AI"}
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode("signin"); setError(""); }}
            className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              mode === "signin"
                ? "border-accent bg-accent/5 text-foreground"
                : "border-border bg-surface-1 text-muted hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <LogIn className="h-4 w-4" />
              Sign In
            </div>
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              mode === "signup"
                ? "border-accent bg-accent/5 text-foreground"
                : "border-border bg-surface-1 text-muted hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <UserPlus className="h-4 w-4" />
              Sign Up
            </div>
          </button>
        </div>

        <div className="space-y-4">
          {mode === "signup" && (
            <Input
              id="name"
              label="Name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email && password && handleSubmit()}
          />

          <Button
            onClick={handleSubmit}
            disabled={!email || !password || loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
