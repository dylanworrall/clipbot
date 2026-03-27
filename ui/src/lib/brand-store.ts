import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./paths";

const BRAND_FILE = path.join(DATA_DIR, "brand.json");

export interface BrandProfile {
  url: string;
  name: string;
  tagline: string;
  tone: string;
  audience: string;
  topics: string[];
  keywords: string[];
  competitors: string[];
  contentPillars: string[];
  voiceExamples: string[];
  createdAt: string;
  updatedAt: string;
}

const EMPTY_BRAND: BrandProfile = {
  url: "",
  name: "",
  tagline: "",
  tone: "",
  audience: "",
  topics: [],
  keywords: [],
  competitors: [],
  contentPillars: [],
  voiceExamples: [],
  createdAt: "",
  updatedAt: "",
};

export async function getBrandProfile(): Promise<BrandProfile | null> {
  try {
    const raw = await readFile(BRAND_FILE, "utf-8");
    return JSON.parse(raw) as BrandProfile;
  } catch {
    return null;
  }
}

export async function saveBrandProfile(profile: BrandProfile): Promise<void> {
  await writeFile(BRAND_FILE, JSON.stringify(profile, null, 2), "utf-8");
}

export async function updateBrandProfile(
  updates: Partial<BrandProfile>
): Promise<BrandProfile> {
  const current = (await getBrandProfile()) || { ...EMPTY_BRAND };
  const merged: BrandProfile = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (!merged.createdAt) {
    merged.createdAt = merged.updatedAt;
  }
  await saveBrandProfile(merged);
  return merged;
}
