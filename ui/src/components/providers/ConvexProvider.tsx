"use client";

import { type ReactNode } from "react";

// Auth is now standalone BetterAuth with SQLite — no Convex dependency
export function ConvexProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
