import { createAuthClient } from "better-auth/react";

const isCloudMode = !!process.env.NEXT_PUBLIC_CONVEX_URL;

// Local mode: no-op auth client that never touches the network
const noopSession = { data: null, isPending: false, error: null };
const noopClient = {
  useSession: () => noopSession,
  signIn: { email: async () => ({ error: null }) },
  signUp: { email: async () => ({ error: null }) },
  signOut: async () => {},
} as unknown as ReturnType<typeof createAuthClient>;

function buildClient() {
  if (!isCloudMode) return noopClient;
  // Cloud mode: full auth client with Convex plugin (billing via Whop embed)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { convexClient } = require("@convex-dev/better-auth/client/plugins");
  return createAuthClient({
    plugins: [convexClient()],
  });
}

export const authClient = buildClient();
export const { useSession, signIn, signUp, signOut } = authClient;
