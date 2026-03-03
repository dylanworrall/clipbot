import { readFile, writeFile } from "node:fs/promises";
import { CREATORS_FILE } from "./paths";

export interface Creator {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl?: string;
  autoProcess: boolean;
  defaultOptions: {
    maxClips?: number;
    minScore?: number;
    maxDuration?: number;
    niche?: string;
  };
  lastCheckedAt?: string;
  lastVideoId?: string;
  createdAt: string;
}

export async function getCreators(): Promise<Creator[]> {
  try {
    const raw = await readFile(CREATORS_FILE, "utf-8");
    return JSON.parse(raw) as Creator[];
  } catch {
    return [];
  }
}

export async function saveCreators(creators: Creator[]): Promise<void> {
  await writeFile(CREATORS_FILE, JSON.stringify(creators, null, 2), "utf-8");
}

export async function addCreator(creator: Creator): Promise<void> {
  const creators = await getCreators();
  creators.push(creator);
  await saveCreators(creators);
}

export async function updateCreator(id: string, updates: Partial<Creator>): Promise<Creator | null> {
  const creators = await getCreators();
  const idx = creators.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  creators[idx] = { ...creators[idx]!, ...updates };
  await saveCreators(creators);
  return creators[idx]!;
}

export async function removeCreator(id: string): Promise<boolean> {
  const creators = await getCreators();
  const filtered = creators.filter((c) => c.id !== id);
  if (filtered.length === creators.length) return false;
  await saveCreators(filtered);
  return true;
}
