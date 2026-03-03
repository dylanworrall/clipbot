"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { AddCreatorDialog } from "@/components/creators/AddCreatorDialog";
import { CreatorCard } from "@/components/creators/CreatorCard";
import { NotificationQueue } from "@/components/creators/NotificationQueue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { PageTransition } from "@/components/ui/PageTransition";
import { PlusCircle, RefreshCw, Loader2 } from "lucide-react";

interface Creator {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  autoProcess: boolean;
  defaultOptions: Record<string, unknown>;
  lastCheckedAt?: string;
  lastVideoId?: string;
}

interface Notification {
  id: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  creatorId: string;
  creatorName: string;
  publishedAt: string;
  status: string;
  runId?: string;
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchCreators = useCallback(() => {
    fetch("/api/creators").then((r) => r.json()).then(setCreators).catch(() => {});
  }, []);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications").then((r) => r.json()).then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCreators();
    fetchNotifications();

    const interval = setInterval(() => {
      fetch("/api/creators/check", { method: "POST" })
        .then(() => {
          fetchCreators();
          fetchNotifications();
        })
        .catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchCreators, fetchNotifications]);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await fetch("/api/creators/check", { method: "POST" });
      fetchCreators();
      fetchNotifications();
    } catch {
      // Error
    }
    setChecking(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/creators/${id}`, { method: "DELETE" });
    fetchCreators();
  };

  const handleProcess = async (notificationId: string) => {
    await fetch(`/api/notifications/${notificationId}/process`, { method: "POST" });
    fetchNotifications();
  };

  const handleDismiss = async (notificationId: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notificationId, status: "dismissed" }),
    });
    fetchNotifications();
  };

  const pendingNotifications = notifications.filter((n) => n.status === "pending");

  return (
    <PageTransition>
      <div className="h-screen overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-16 space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Creator Monitor</h1>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleCheckNow} disabled={checking}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Check Now
              </Button>
              <Button variant="primary" onClick={() => setShowAdd(true)}>
                <PlusCircle className="h-4 w-4" />
                Add Creator
              </Button>
            </div>
          </div>

          {/* Notification Queue */}
          {pendingNotifications.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                New Videos ({pendingNotifications.length})
              </h2>
              <NotificationQueue
                notifications={pendingNotifications}
                onProcess={handleProcess}
                onDismiss={handleDismiss}
              />
            </div>
          )}

          {/* Creator List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Tracked Creators ({creators.length})</h2>
            {creators.length === 0 ? (
              <Card className="text-center py-10">
                <p className="text-sm text-muted">
                  No creators tracked yet. Add a YouTube channel to start monitoring.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {creators.map((creator, i) => (
                  <motion.div
                    key={creator.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <CreatorCard
                      creator={creator}
                      onDelete={handleDelete}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <AddCreatorDialog
            open={showAdd}
            onClose={() => setShowAdd(false)}
            onAdded={() => {
              setShowAdd(false);
              fetchCreators();
            }}
          />
        </div>
      </div>
    </PageTransition>
  );
}
