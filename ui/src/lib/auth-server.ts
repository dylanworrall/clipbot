import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { toNextJsHandler } from "better-auth/next-js";

const isProduction = process.env.NODE_ENV === "production";
const dataDir = process.env.CLIPBOT_HOME || (isProduction ? "/data" : path.resolve(process.cwd(), "data"));
mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "auth.db");

// Initialize SQLite with WAL mode for better concurrent performance
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Auto-create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY,
    expiresAt TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES "user"(id)
  );
  CREATE TABLE IF NOT EXISTS "account" (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES "user"(id),
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt TEXT,
    refreshTokenExpiresAt TEXT,
    scope TEXT,
    password TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "verification" (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT
  );
`);

export const auth = betterAuth({
  database: db,
  baseURL: process.env.BETTER_AUTH_URL || (isProduction ? "https://content.soshi.dev" : "http://localhost:3000"),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://content.soshi.dev",
    "https://content-pipeline-worker.fly.dev",
    "https://*.vercel.app",
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min cache
    },
  },
});

export const handler = toNextJsHandler(auth);
