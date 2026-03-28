"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, LogIn } from "lucide-react";
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

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

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
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-[28px] font-serif text-white tracking-wide">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground font-medium">
            {mode === "signin"
              ? "Sign in to your Socials account"
              : "Start creating viral clips with AI"}
          </p>
        </div>

        {/* Mode selector — Tab Switcher pattern */}
        <div className="bg-surface-1 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => { setMode("signin"); setError(""); }}
            className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === "signin"
                ? "bg-surface-2 text-white shadow-sm"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <LogIn size={14} />
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === "signup"
                ? "bg-surface-2 text-white shadow-sm"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <UserPlus size={14} />
            Sign Up
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
              <Loader2 size={16} className="animate-spin" />
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </div>

        {error && (
          <div className="rounded-xl bg-[#FF453A]/10 border border-border px-4 py-3 text-[13px] font-medium text-[#FF453A]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
