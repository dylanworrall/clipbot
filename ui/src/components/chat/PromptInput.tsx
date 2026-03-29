"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Loader2, Send, Bot, Slash, Paperclip, Film, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpaceSelector } from "@/components/spaces/SpaceSelector";
import { useSpace } from "@/contexts/SpaceContext";

/** Match video URLs from any platform yt-dlp supports */
function isVideoUrl(input: string): boolean {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");
    if ((host === "youtube.com" || host === "m.youtube.com") && (url.searchParams.has("v") || /^\/(shorts|embed|v)\//.test(url.pathname))) return true;
    if (host === "youtu.be" && url.pathname.length > 1) return true;
    if ((host === "twitch.tv" || host === "clips.twitch.tv") && url.pathname.length > 1) return true;
    if (host === "kick.com" && url.pathname.length > 1) return true;
    if ((host === "twitter.com" || host === "x.com") && /\/status\/\d+/.test(url.pathname)) return true;
    if ((host === "facebook.com" || host === "fb.watch") && url.pathname.length > 1) return true;
    if ((host === "tiktok.com" || host.endsWith(".tiktok.com")) && url.pathname.length > 1) return true;
    if (host === "instagram.com" && /^\/(reel|p)\//.test(url.pathname)) return true;
    if ((host === "reddit.com" || host.endsWith(".reddit.com")) && /\/comments\//.test(url.pathname)) return true;
    if ((host === "dailymotion.com" || host === "dai.ly") && url.pathname.length > 1) return true;
    if (host === "vimeo.com" && /^\/\d+/.test(url.pathname)) return true;
  } catch {
    return false;
  }
  return false;
}

const SLASH_COMMANDS = [
  { command: "/spaces", description: "List all spaces", hint: "list my spaces" },
  { command: "/runs", description: "Show recent runs", hint: "show my recent runs" },
  { command: "/creators", description: "List tracked creators", hint: "list my creators" },
  { command: "/add-creator", description: "Add a YouTube creator", hint: "add creator" },
  { command: "/schedule", description: "List scheduled posts", hint: "show my scheduled posts" },
  { command: "/settings", description: "View current settings", hint: "show my settings" },
  { command: "/new-space", description: "Create a new space", hint: "create a new space" },
] as const;

interface PromptInputProps {
  onSubmit: (runId: string, sourceUrl: string) => void;
  onChat?: (message: string) => void;
  spaceId?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

const VIDEO_EXTENSIONS = [".mov", ".mp4", ".mkv", ".avi", ".webm", ".m4v", ".flv", ".wmv"];
const VIDEO_MIMES = ["video/", "application/octet-stream", "video/quicktime", "video/mp4", "video/x-msvideo", "video/x-matroska", "video/webm"];

export function PromptInput({ onSubmit, onChat, spaceId: externalSpaceId, fullWidth, disabled }: PromptInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { activeSpaceId, setActiveSpace } = useSpace();

  const spaceId = externalSpaceId ?? activeSpaceId ?? undefined;
  const inputIsVideoUrl = isVideoUrl(input);
  const inputIsSlashCommand = input.trim().startsWith("/");

  const handleFilePick = useCallback((file: File) => {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    const mime = file.type?.toLowerCase() || "";
    const isVideoExt = VIDEO_EXTENSIONS.includes(ext);
    const isVideoMime = VIDEO_MIMES.some((m) => mime.startsWith(m));

    // Accept if extension OR mime type matches video
    if (!isVideoExt && !isVideoMime) {
      setError(`"${file.name}" doesn't look like a video. Supported: ${VIDEO_EXTENSIONS.join(", ")}`);
      return;
    }
    setPendingFile(file);
    setError("");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFilePick(file);
  }, [handleFilePick]);

  const uploadFile = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      // 1. Init upload session
      const initRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init", fileName: file.name, fileSize: file.size, spaceId }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Init failed");

      const { uploadId, filePath: savedName } = initData;

      // 2. Upload in 2MB chunks
      const CHUNK_SIZE = 2 * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const chunkRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "x-upload-id": uploadId,
            "x-file-name": savedName,
          },
          body: chunk,
        });

        if (!chunkRes.ok) {
          const err = await chunkRes.json().catch(() => ({ error: "Chunk failed" }));
          throw new Error(err.error || `Chunk ${i + 1}/${totalChunks} failed`);
        }
      }

      // 3. Complete — start pipeline
      const completeRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", uploadId, fileName: savedName, spaceId }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || "Complete failed");

      setPendingFile(null);
      onSubmit(completeData.runId, `file://${file.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setLoading(false);
  };

  const matchingCommands = useMemo(() => {
    if (!inputIsSlashCommand || !onChat) return [];
    const typed = input.trim().toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.command.startsWith(typed));
  }, [input, inputIsSlashCommand, onChat]);

  const mode = input.trim()
    ? inputIsVideoUrl
      ? "url"
      : onChat
        ? "chat"
        : null
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || disabled) return;

    if (!inputIsVideoUrl && onChat) {
      let message = input.trim();
      if (inputIsSlashCommand) {
        const match = SLASH_COMMANDS.find((c) => message.toLowerCase().startsWith(c.command));
        if (match) {
          const extra = message.slice(match.command.length).trim();
          message = extra ? `${match.hint} ${extra}` : match.hint;
        }
      }
      setInput("");
      onChat(message);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input, spaceId }),
      });

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        throw new Error(res.ok ? "Empty response from server" : `Server error (${res.status})`);
      }

      if (res.status === 409 && data.existingRunId) {
        if (data.alreadyComplete) {
          const retryRes = await fetch("/api/runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: input, spaceId, force: true }),
          });
          let retryData: Record<string, unknown>;
          try { retryData = await retryRes.json(); } catch { retryData = {}; }
          if (retryRes.ok) {
            setInput("");
            onSubmit(retryData.runId as string, input);
          } else {
            setError((retryData.error as string) || "Failed to start pipeline");
          }
        } else {
          setError("This video is already being processed");
        }
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error((data.error as string) || "Failed to start pipeline");
      }

      setInput("");
      onSubmit(data.runId as string, input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  const handleSlashSelect = (command: typeof SLASH_COMMANDS[number]) => {
    if (onChat) {
      setInput("");
      onChat(command.hint);
    }
  };

  return (
    <div className={cn(fullWidth ? "" : "bg-background px-4 py-3")}>
      {/* Slash command autocomplete */}
      {matchingCommands.length > 0 && (
        <div className={cn(
          "bg-surface-0/95 backdrop-blur-2xl border border-border ring-1 ring-white/5 rounded-2xl mb-2 overflow-hidden shadow-2xl",
          !fullWidth && "max-w-2xl mx-auto"
        )}>
          {matchingCommands.map((cmd) => (
            <button
              key={cmd.command}
              type="button"
              onClick={() => handleSlashSelect(cmd)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors"
            >
              <span className="flex items-center justify-center h-6 w-6 rounded-md bg-[#0A84FF]/10 text-[#0A84FF] flex-shrink-0">
                <Slash size={12} />
              </span>
              <div className="min-w-0">
                <span className="text-[13px] font-medium text-foreground">{cmd.command}</span>
                <span className="text-[11px] text-muted-foreground ml-2">{cmd.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept={`${VIDEO_EXTENSIONS.join(",")},video/*`}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f); if (fileRef.current) fileRef.current.value = ""; }}
        className="hidden"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pendingFile) { uploadFile(pendingFile); return; }
          handleSubmit(e);
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "bg-surface-1 border rounded-2xl overflow-hidden shadow-xl transition-colors",
          dragOver ? "border-[#0A84FF]/40 bg-[#0A84FF]/5" : "border-border",
          !fullWidth && "max-w-2xl mx-auto"
        )}
      >
        {/* Pending file preview */}
        {pendingFile && (
          <div className="flex items-center gap-3 px-4 pt-3 pb-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#BF5AF2]/10 border border-border">
              <Film size={14} className="text-[#BF5AF2]" />
              <span className="text-[12px] font-medium text-foreground/70 truncate max-w-[200px]">{pendingFile.name}</span>
              <span className="text-[10px] text-muted-foreground/70">{(pendingFile.size / 1024 / 1024).toFixed(0)}MB</span>
              <button type="button" onClick={() => setPendingFile(null)} className="text-muted-foreground/70 hover:text-white transition-colors">
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="px-4 pt-3 pb-2">
          <input
            type="text"
            placeholder={pendingFile ? "Press Enter to start clipping..." : onChat ? "Paste a URL, drop a video file, or ask anything..." : "Paste a URL or drop a video file..."}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            disabled={disabled}
            className="w-full bg-transparent text-[15px] font-medium text-white placeholder:text-muted-foreground/50 outline-none disabled:opacity-40"
          />
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <div className="flex items-center gap-1">
            <SpaceSelector
              value={externalSpaceId ?? activeSpaceId}
              onChange={(id) => {
                if (!externalSpaceId) setActiveSpace(id);
              }}
              readOnly={!!externalSpaceId}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading || disabled}
              className="flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Upload video file (.mov, .mp4, etc.)"
            >
              <Paperclip size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {pendingFile && (
              <span className="px-2 py-0.5 rounded-md bg-[#BF5AF2]/10 text-[#BF5AF2] text-[10px] font-medium flex items-center gap-1">
                <Film size={10} /> File
              </span>
            )}
            {!pendingFile && mode === "chat" && (
              <span className="px-2 py-0.5 rounded-md bg-[#0A84FF]/10 text-[#0A84FF] text-[10px] font-medium flex items-center gap-1">
                {inputIsSlashCommand ? <Slash size={10} /> : <Bot size={10} />}
                {inputIsSlashCommand ? "Command" : "AI"}
              </span>
            )}
            <button
              type="submit"
              disabled={loading || disabled || (!input.trim() && !pendingFile)}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg transition-colors cursor-pointer",
                (input.trim() || pendingFile) && !loading && !disabled
                  ? "bg-[#0A84FF] text-white hover:bg-blue-500"
                  : "bg-surface-2 text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : pendingFile ? (
                <Send size={16} />
              ) : mode === "chat" ? (
                <Bot size={16} />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <p className={cn("text-[12px] font-medium text-[#FF453A] mt-1.5 px-4", !fullWidth && "max-w-2xl mx-auto")}>{error}</p>
      )}
    </div>
  );
}
