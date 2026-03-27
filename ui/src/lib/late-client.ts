import { getEffectiveConfig } from "@/lib/settings-store";

const LATE_BASE = "https://zernio.com/api/v1";

export interface LatePostAnalytics {
  impressions?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  engagement?: number;
}

export interface LatePost {
  _id: string;
  content: string;
  status: string;
  platforms: Array<{
    platform: string;
    accountId: string;
    status?: string;
    url?: string;
  }>;
  mediaItems: Array<{ type: string; url: string }>;
  scheduledFor?: string;
  publishedAt?: string;
  analytics?: LatePostAnalytics;
  createdAt?: string;
  updatedAt?: string;
}

export interface LateAccount {
  _id: string;
  platform: string;
  name: string;
}

async function lateApiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const config = await getEffectiveConfig();
  if (!config.lateApiKey) {
    throw new Error("Late API key not configured");
  }

  const res = await fetch(`${LATE_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.lateApiKey}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Late API error ${res.status}: ${body}`);
  }

  return res;
}

export async function listPosts(filters?: {
  status?: string;
  platform?: string;
  limit?: number;
}): Promise<LatePost[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.platform) params.set("platform", filters.platform);
  if (filters?.limit) params.set("limit", String(filters.limit));

  const qs = params.toString();
  const res = await lateApiFetch(`/posts${qs ? `?${qs}` : ""}`);
  const data = (await res.json()) as { posts?: LatePost[] };
  return data.posts ?? [];
}

export async function getPost(postId: string): Promise<LatePost> {
  const res = await lateApiFetch(`/posts/${postId}`);
  const data = (await res.json()) as { post?: LatePost } & LatePost;
  return data.post ?? data;
}

export async function updatePost(
  postId: string,
  updates: { content?: string; scheduledFor?: string }
): Promise<LatePost> {
  const res = await lateApiFetch(`/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  const data = (await res.json()) as { post?: LatePost } & LatePost;
  return data.post ?? data;
}

export async function deletePost(postId: string): Promise<void> {
  await lateApiFetch(`/posts/${postId}`, { method: "DELETE" });
}

export async function createPost(payload: {
  content: string;
  platforms: Array<{ platform: string; accountId: string }>;
  scheduledFor?: string;
}): Promise<LatePost> {
  const res = await lateApiFetch("/posts", {
    method: "POST",
    body: JSON.stringify({
      content: payload.content,
      mediaItems: [],
      platforms: payload.platforms,
      publishNow: false,
      ...(payload.scheduledFor && { scheduledFor: payload.scheduledFor }),
    }),
  });
  const data = (await res.json()) as { post?: LatePost } & LatePost;
  return data.post ?? data;
}

export async function publishPost(postId: string): Promise<LatePost> {
  const res = await lateApiFetch(`/posts/${postId}/publish`, {
    method: "POST",
  });
  const data = (await res.json()) as { post?: LatePost } & LatePost;
  return data.post ?? data;
}

export async function listLateAccounts(): Promise<LateAccount[]> {
  const res = await lateApiFetch("/accounts");
  const data = (await res.json()) as {
    accounts: Array<{
      _id: string;
      platform: string;
      displayName?: string;
      name?: string;
      username?: string;
    }>;
  };
  return (data.accounts ?? []).map((a) => ({
    _id: a._id,
    platform: a.platform,
    name: a.displayName ?? a.name ?? a.username ?? a._id,
  }));
}
