"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  RefreshCw,
  Calendar,
  Bookmark,
  MousePointer,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------- types (matching Zernio response schema) ---------- */

interface ZernioPostAnalytics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
  engagementRate: number;
  lastUpdated?: string;
}

interface ZernioPlatformAnalytics {
  platform: string;
  status: string;
  accountUsername?: string;
  analytics: ZernioPostAnalytics;
  platformPostUrl?: string;
}

interface ZernioPost {
  postId: string;
  latePostId?: string;
  status: string;
  content: string;
  publishedAt?: string;
  scheduledFor?: string;
  analytics: ZernioPostAnalytics;
  platformAnalytics?: ZernioPlatformAnalytics[];
  platform?: string;
  platformPostUrl?: string;
  thumbnailUrl?: string;
  mediaType?: string;
  syncStatus?: string;
}

interface ZernioOverview {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
}

type SortKey = "views" | "likes" | "comments" | "engagement" | "date";
type SortDir = "asc" | "desc";

/* ---------- helpers ---------- */

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#FF453A", tiktok: "#BF5AF2", instagram: "#FF9F0A",
  twitter: "#0A84FF", linkedin: "#0A84FF", facebook: "#0A84FF",
  bluesky: "#0A84FF", threads: "#BF5AF2", pinterest: "#FF453A",
  reddit: "#FF9F0A", snapchat: "#FF9F0A", whatsapp: "#30D158",
};

const PLATFORM_BADGE: Record<string, "red" | "blue" | "gold" | "green" | "default"> = {
  youtube: "red", tiktok: "default", instagram: "gold",
  twitter: "blue", linkedin: "blue", facebook: "blue", bluesky: "blue",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function title(content: string): string {
  if (!content) return "Untitled";
  const first = content.split("\n")[0].trim();
  return first.length > 60 ? first.slice(0, 57) + "..." : first;
}

function getPlatform(post: ZernioPost): string {
  if (post.platform) return post.platform;
  if (post.platformAnalytics?.[0]?.platform) return post.platformAnalytics[0].platform;
  return "unknown";
}

/* ---------- component ---------- */

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<ZernioPost[]>([]);
  const [overview, setOverview] = useState<ZernioOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(90);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fromDate = useMemo(() => {
    if (dateRange === 0) return "2020-01-01";
    return new Date(Date.now() - dateRange * 86400000).toISOString().split("T")[0];
  }, [dateRange]);
  const toDate = new Date().toISOString().split("T")[0];

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const zernioSort = sortBy === "engagement" ? "engagement" : sortBy === "date" ? "date" : sortBy;
      const params = new URLSearchParams({
        fromDate,
        toDate,
        sortBy: zernioSort,
        order: sortDir,
        limit: "100",
      });
      if (platformFilter !== "all") params.set("platform", platformFilter);

      const res = await fetch(`/api/analytics?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

      // Zernio returns: { overview, posts[], pagination, accounts[] }
      const rawPosts = data.posts ?? [];
      setPosts(rawPosts);
      setOverview(data.overview ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      setPosts([]);
    }
    setLoading(false);
  }, [fromDate, toDate, platformFilter, sortBy, sortDir]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Client-side sort (Zernio already sorts, but for toggling)
  const sorted = useMemo(() => {
    const result = [...posts];
    result.sort((a, b) => {
      let diff = 0;
      if (sortBy === "date") {
        diff = new Date(a.publishedAt ?? "").getTime() - new Date(b.publishedAt ?? "").getTime();
      } else if (sortBy === "engagement") {
        diff = (a.analytics?.engagementRate ?? 0) - (b.analytics?.engagementRate ?? 0);
      } else {
        diff = (a.analytics?.[sortBy] ?? 0) - (b.analytics?.[sortBy] ?? 0);
      }
      return sortDir === "asc" ? diff : -diff;
    });
    return result;
  }, [posts, sortBy, sortDir]);

  // Aggregates
  const totalViews = sorted.reduce((s, p) => s + (p.analytics?.views ?? 0), 0);
  const totalLikes = sorted.reduce((s, p) => s + (p.analytics?.likes ?? 0), 0);
  const totalComments = sorted.reduce((s, p) => s + (p.analytics?.comments ?? 0), 0);
  const totalShares = sorted.reduce((s, p) => s + (p.analytics?.shares ?? 0), 0);
  const totalSaves = sorted.reduce((s, p) => s + (p.analytics?.saves ?? 0), 0);
  const avgEngagement = sorted.length > 0
    ? Math.round((sorted.reduce((s, p) => s + (p.analytics?.engagementRate ?? 0), 0) / sorted.length) * 100) / 100
    : 0;

  // Platform breakdown
  const platformBreakdown = useMemo(() => {
    const map: Record<string, { count: number; views: number; engagement: number }> = {};
    for (const p of sorted) {
      const plat = getPlatform(p);
      if (!map[plat]) map[plat] = { count: 0, views: 0, engagement: 0 };
      map[plat].count += 1;
      map[plat].views += p.analytics?.views ?? 0;
      map[plat].engagement += p.analytics?.engagementRate ?? 0;
    }
    const entries = Object.entries(map).sort((a, b) => b[1].views - a[1].views);
    const maxViews = entries[0]?.[1].views ?? 1;
    return entries.map(([platform, data]) => ({
      platform,
      count: data.count,
      views: data.views,
      avgEngagement: data.count > 0 ? Math.round((data.engagement / data.count) * 100) / 100 : 0,
      pct: Math.round((data.views / Math.max(maxViews, 1)) * 100),
    }));
  }, [sorted]);

  // Unique platforms for filter
  const availablePlatforms = useMemo(() => {
    const set = new Set(posts.map(getPlatform));
    return ["all", ...Array.from(set)];
  }, [posts]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <ArrowUpDown size={10} className="text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ArrowUp size={10} className="text-[#0A84FF]" />
      : <ArrowDown size={10} className="text-[#0A84FF]" />;
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Analytics</h1>
            <p className="text-muted-foreground text-[13px] font-medium">
              {overview
                ? `${overview.publishedPosts} published · ${overview.scheduledPosts} scheduled`
                : `${sorted.length} post${sorted.length !== 1 ? "s" : ""}`}
              {totalViews > 0 && ` · ${fmt(totalViews)} total views`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-surface-1 p-1 rounded-lg flex gap-1">
              {[
                { label: "7d", days: 7 },
                { label: "30d", days: 30 },
                { label: "90d", days: 90 },
                { label: "All", days: 0 },
              ].map((r) => (
                <button
                  key={r.days}
                  onClick={() => setDateRange(r.days)}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dateRange === r.days
                      ? "bg-surface-2 text-white shadow-sm"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={fetchAnalytics}>
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {/* Platform filter pills */}
        {availablePlatforms.length > 2 && (
          <div className="flex gap-1.5 flex-wrap">
            {availablePlatforms.map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors capitalize ${
                  platformFilter === p
                    ? "bg-[#0A84FF]/10 text-[#0A84FF] border border-[#0A84FF]/30"
                    : "bg-surface-1 text-muted-foreground hover:text-white border border-border"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm text-center py-12">
            <BarChart3 size={32} className="text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-[15px] font-medium text-muted-foreground">Could not load analytics</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1 max-w-md mx-auto">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchAnalytics} className="mt-4">
              <RefreshCw size={14} /> Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-3 md:grid-cols-6 gap-3"
            >
              {[
                { label: "Views", value: totalViews, icon: Eye, color: "#0A84FF" },
                { label: "Likes", value: totalLikes, icon: Heart, color: "#FF375F" },
                { label: "Comments", value: totalComments, icon: MessageCircle, color: "#FF9F0A" },
                { label: "Shares", value: totalShares, icon: Share2, color: "#BF5AF2" },
                { label: "Saves", value: totalSaves, icon: Bookmark, color: "#30D158" },
                { label: "Avg Eng.", value: avgEngagement, icon: TrendingUp, color: "#30D158", isPercent: true },
              ].map((s) => (
                <div key={s.label} className="bg-surface-1 rounded-2xl p-4 border border-border shadow-sm text-center">
                  <s.icon size={14} className="mx-auto mb-2" style={{ color: s.color }} />
                  <p className="text-[20px] font-bold tracking-tight tabular-nums" style={{ color: s.color }}>
                    {s.isPercent ? `${s.value}%` : fmt(s.value as number)}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 font-medium uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Platform breakdown */}
            {platformBreakdown.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.2 }}
                className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-3"
              >
                <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-4">
                  Platform Performance
                </h2>
                {platformBreakdown.map((entry) => (
                  <div key={entry.platform} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24 shrink-0">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: PLATFORM_COLORS[entry.platform] ?? "#0A84FF" }}
                      />
                      <span className="text-[12px] font-medium text-foreground/70 capitalize">{entry.platform}</span>
                    </div>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: PLATFORM_COLORS[entry.platform] ?? "#0A84FF" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${entry.pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                      />
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-muted-foreground tabular-nums w-12 text-right">{entry.count} posts</span>
                      <span className="text-[12px] text-foreground/70 font-medium tabular-nums w-14 text-right">{fmt(entry.views)}</span>
                      <span className="text-[11px] tabular-nums w-12 text-right" style={{ color: entry.avgEngagement >= 4 ? "#30D158" : "#FF9F0A" }}>
                        {entry.avgEngagement}%
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Sort bar */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Post Performance
              </h2>
              <div className="flex items-center gap-1">
                {(["date", "views", "likes", "comments", "engagement"] as SortKey[]).map((col) => (
                  <button
                    key={col}
                    onClick={() => handleSort(col)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                      sortBy === col
                        ? "bg-[#0A84FF]/10 text-[#0A84FF]"
                        : "text-muted-foreground hover:text-white hover:bg-white/10"
                    )}
                  >
                    {col === "engagement" ? "Eng." : col.charAt(0).toUpperCase() + col.slice(1)}
                    <SortIcon col={col} />
                  </button>
                ))}
              </div>
            </div>

            {/* Post list */}
            {sorted.length === 0 ? (
              <div className="text-center py-16">
                <BarChart3 size={32} className="text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-[15px] font-medium text-muted-foreground">No published posts found</p>
                <p className="text-[12px] text-muted-foreground/70 mt-1">
                  Publish clips or drafts to see analytics here
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
                className="space-y-1"
              >
                {sorted.map((post, idx) => {
                  const plat = getPlatform(post);
                  const eng = post.analytics?.engagementRate ?? 0;
                  const url = post.platformPostUrl ?? post.platformAnalytics?.[0]?.platformPostUrl;
                  const key = post.postId || post.latePostId || `post-${idx}`;
                  return (
                    <div
                      key={key}
                      className="group flex items-center gap-4 p-4 rounded-xl hover:bg-surface-1 transition-colors border border-transparent hover:border-border"
                    >
                      {/* Thumbnail */}
                      {post.thumbnailUrl && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-2 shrink-0">
                          <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Platform + title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: PLATFORM_COLORS[plat] ?? "#0A84FF" }}
                          />
                          <h3 className="text-[14px] font-medium text-foreground truncate">
                            {title(post.content)}
                          </h3>
                          {url && (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink size={12} className="text-muted-foreground/70 hover:text-[#0A84FF]" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pl-4">
                          <Badge variant={PLATFORM_BADGE[plat] ?? "default"} className="text-[10px] capitalize">
                            {plat}
                          </Badge>
                          {post.publishedAt && (
                            <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                          {post.syncStatus && post.syncStatus !== "synced" && (
                            <span className="text-[10px] text-[#FF9F0A]">{post.syncStatus}</span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-5 shrink-0">
                        <div className="text-right">
                          <p className="text-[12px] font-medium tabular-nums text-foreground">{fmt(post.analytics?.views ?? 0)}</p>
                          <p className="text-[10px] text-muted-foreground/60">views</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] font-medium tabular-nums text-foreground">{fmt(post.analytics?.likes ?? 0)}</p>
                          <p className="text-[10px] text-muted-foreground/60">likes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] font-medium tabular-nums text-foreground">{fmt(post.analytics?.comments ?? 0)}</p>
                          <p className="text-[10px] text-muted-foreground/60">comments</p>
                        </div>
                        <div className="text-right w-14">
                          <p className={cn(
                            "text-[12px] font-medium tabular-nums",
                            eng >= 8 ? "text-[#30D158]" : eng >= 4 ? "text-[#FF9F0A]" : "text-muted-foreground"
                          )}>
                            {eng.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">eng.</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Footer */}
            {sorted.length > 0 && (
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground/60 pt-2">
                <span>{sorted.length} posts</span>
                <span>{fmt(totalViews)} views</span>
                <span>{fmt(totalLikes)} likes</span>
                <span>{fmt(totalComments)} comments</span>
                <span>{fmt(totalShares)} shares</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
