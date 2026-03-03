import { readFile, writeFile } from "node:fs/promises";
import { NOTIFICATIONS_FILE } from "./paths";

export interface VideoNotification {
  id: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  creatorId: string;
  creatorName: string;
  publishedAt: string;
  status: "pending" | "processing" | "dismissed";
  runId?: string;
  createdAt: string;
}

export async function getNotifications(): Promise<VideoNotification[]> {
  try {
    const raw = await readFile(NOTIFICATIONS_FILE, "utf-8");
    return JSON.parse(raw) as VideoNotification[];
  } catch {
    return [];
  }
}

export async function saveNotifications(notifications: VideoNotification[]): Promise<void> {
  await writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), "utf-8");
}

export async function addNotification(notification: VideoNotification): Promise<void> {
  const notifications = await getNotifications();
  // Avoid duplicates
  if (notifications.some((n) => n.videoId === notification.videoId)) return;
  notifications.push(notification);
  await saveNotifications(notifications);
}

export async function updateNotification(id: string, updates: Partial<VideoNotification>): Promise<VideoNotification | null> {
  const notifications = await getNotifications();
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  notifications[idx] = { ...notifications[idx]!, ...updates };
  await saveNotifications(notifications);
  return notifications[idx]!;
}

export async function getPendingCount(): Promise<number> {
  const notifications = await getNotifications();
  return notifications.filter((n) => n.status === "pending").length;
}
