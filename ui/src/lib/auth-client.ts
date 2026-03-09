import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth/client";

export const authClient = createAuthClient({
  plugins: [convexClient(), polarClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
