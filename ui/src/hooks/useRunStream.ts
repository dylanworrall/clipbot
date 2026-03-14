"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PipelineManifest } from "@/lib/run-store";

// Connect directly to worker for SSE (bypasses Vercel function timeout)
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

export interface DownloadProgress {
  percent: number;
  speed: string;
  eta: string;
}

interface UseRunStreamResult {
  manifest: PipelineManifest | null;
  downloadProgress: DownloadProgress | null;
  connected: boolean;
  error: string | null;
}

export function useRunStream(runId: string): UseRunStreamResult {
  const [manifest, setManifest] = useState<PipelineManifest | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  const connect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
    }
    doneRef.current = false;

    // Direct to worker for long-lived SSE, fallback to Vercel proxy
    const streamUrl = WORKER_URL
      ? `${WORKER_URL}/jobs/${runId}/stream`
      : `/api/runs/${runId}/stream`;

    const es = new EventSource(streamUrl);
    sourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.downloadProgress) {
          setDownloadProgress(data.downloadProgress);
        } else {
          setDownloadProgress(null);
        }
        setManifest(data as PipelineManifest);

        if (data.status === "complete" || data.status === "failed") {
          doneRef.current = true;
          es.close();
          setConnected(false);
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setError(data.message);
      } catch {
        // Connection error, not a data error
      }
      es.close();
      setConnected(false);
    });

    es.onerror = () => {
      es.close();
      setConnected(false);
      // Auto-reconnect if pipeline isn't done (handles Fly.io cold start / transient errors)
      if (!doneRef.current) {
        reconnectTimer.current = setTimeout(() => connect(), 2000);
      }
    };
  }, [runId]);

  useEffect(() => {
    connect();
    return () => {
      doneRef.current = true;
      sourceRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return { manifest, downloadProgress, connected, error };
}
