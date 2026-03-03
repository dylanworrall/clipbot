import { readFile, writeFile } from "node:fs/promises";
import { SCHEDULE_FILE } from "./paths";

export interface ScheduledPost {
  id: string;
  runId: string;
  clipIndex: number;
  clipTitle: string;
  platforms: string[];
  scheduledFor: string; // ISO date string
  status: "scheduled" | "published" | "cancelled";
  createdAt: string;
  postId?: string;
}

export async function getScheduledPosts(): Promise<ScheduledPost[]> {
  try {
    const raw = await readFile(SCHEDULE_FILE, "utf-8");
    return JSON.parse(raw) as ScheduledPost[];
  } catch {
    return [];
  }
}

export async function saveScheduledPosts(posts: ScheduledPost[]): Promise<void> {
  await writeFile(SCHEDULE_FILE, JSON.stringify(posts, null, 2), "utf-8");
}

export async function addScheduledPost(post: ScheduledPost): Promise<void> {
  const posts = await getScheduledPosts();
  posts.push(post);
  await saveScheduledPosts(posts);
}

export async function updateScheduledPost(id: string, updates: Partial<ScheduledPost>): Promise<ScheduledPost | null> {
  const posts = await getScheduledPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx]!, ...updates };
  await saveScheduledPosts(posts);
  return posts[idx]!;
}

export async function removeScheduledPost(id: string): Promise<boolean> {
  const posts = await getScheduledPosts();
  const filtered = posts.filter((p) => p.id !== id);
  if (filtered.length === posts.length) return false;
  await saveScheduledPosts(filtered);
  return true;
}
