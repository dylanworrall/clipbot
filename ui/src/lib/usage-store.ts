import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const isProduction = process.env.NODE_ENV === "production";
const dataDir = process.env.CLIPBOT_HOME || (isProduction ? "/data" : path.resolve(process.cwd(), "data"));
const USAGE_FILE = path.join(dataDir, "usage.json");

const FREE_LIMIT = 3; // 3 free chats/pipeline runs

interface UsageData {
  [email: string]: {
    count: number;
    tier: string;
    periodStart: string;
  };
}

async function load(): Promise<UsageData> {
  try {
    return JSON.parse(await readFile(USAGE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

async function save(data: UsageData) {
  await writeFile(USAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function checkUsage(email: string): Promise<{ allowed: boolean; count: number; limit: number; tier: string }> {
  const data = await load();
  const user = data[email];

  if (!user) {
    return { allowed: true, count: 0, limit: FREE_LIMIT, tier: "free" };
  }

  // Paid tiers have high limits
  if (user.tier === "pro") return { allowed: true, count: user.count, limit: 1000, tier: "pro" };
  if (user.tier === "business") return { allowed: true, count: user.count, limit: 5000, tier: "business" };

  // Check 30-day rolling period
  const periodStart = new Date(user.periodStart);
  const now = new Date();
  const daysSince = (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSince >= 30) {
    // Reset period
    data[email] = { count: 0, tier: "free", periodStart: now.toISOString() };
    await save(data);
    return { allowed: true, count: 0, limit: FREE_LIMIT, tier: "free" };
  }

  return {
    allowed: user.count < FREE_LIMIT,
    count: user.count,
    limit: FREE_LIMIT,
    tier: "free",
  };
}

export async function incrementUsage(email: string): Promise<void> {
  const data = await load();
  if (!data[email]) {
    data[email] = { count: 0, tier: "free", periodStart: new Date().toISOString() };
  }
  data[email].count += 1;
  await save(data);
}

export async function setTier(email: string, tier: string): Promise<void> {
  const data = await load();
  if (!data[email]) {
    data[email] = { count: 0, tier, periodStart: new Date().toISOString() };
  } else {
    data[email].tier = tier;
  }
  await save(data);
}
