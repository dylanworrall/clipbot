import { NextResponse } from "next/server";

const isCloudMode = !!process.env.NEXT_PUBLIC_CONVEX_URL;

// Only initialize BetterAuth in cloud mode — local mode doesn't use Convex auth
const authExports = isCloudMode
  ? (() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { convexBetterAuthNextJs } = require("@convex-dev/better-auth/nextjs");
      return convexBetterAuthNextJs({
        convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
        convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
      });
    })()
  : {
      handler: {
        GET: () => NextResponse.json({ error: "Auth not available in local mode" }, { status: 404 }),
        POST: () => NextResponse.json({ error: "Auth not available in local mode" }, { status: 404 }),
      },
      preloadAuthQuery: null,
      isAuthenticated: () => false,
      getToken: () => null,
      fetchAuthQuery: null,
      fetchAuthMutation: null,
      fetchAuthAction: null,
    };

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = authExports;
