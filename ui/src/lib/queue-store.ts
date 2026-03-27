import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./paths";

const QUEUE_FILE = path.join(DATA_DIR, "queue.json");

export interface QueueItem {
  id: string;
  content: string;
  title: string;
  format: "tweet" | "thread" | "linkedin" | "caption" | "script" | "meme";
  platforms: string[];
  estimatedScore: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  topic?: string;
  hashtags?: string[];
}

export async function getQueueItems(): Promise<QueueItem[]> {
  try {
    const raw = await readFile(QUEUE_FILE, "utf-8");
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

async function saveQueueItems(items: QueueItem[]): Promise<void> {
  await writeFile(QUEUE_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export async function addQueueItem(item: QueueItem): Promise<void> {
  const items = await getQueueItems();
  items.push(item);
  await saveQueueItems(items);
}

export async function updateQueueItem(
  id: string,
  updates: Partial<QueueItem>
): Promise<QueueItem | null> {
  const items = await getQueueItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx]!, ...updates };
  await saveQueueItems(items);
  return items[idx]!;
}

export async function removeQueueItem(id: string): Promise<boolean> {
  const items = await getQueueItems();
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return false;
  await saveQueueItems(filtered);
  return true;
}

export async function getPendingItems(): Promise<QueueItem[]> {
  const items = await getQueueItems();
  return items.filter((i) => i.status === "pending");
}
