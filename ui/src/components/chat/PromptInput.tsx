"use client";

import { useState, useMemo } from "react";
import { Loader2, Send, Bot, Slash } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpaceSelector } from "@/components/spaces/SpaceSelector";
import { useSpace } from "@/contexts/SpaceContext";

/** Only match processable video URLs — not channels, playlists, or bare domains */
function isVideoUrl(input: string): boolean {
  const trimmed = input.trim();
  // youtu.be/VIDEO_ID short links
  if (/^(https?:\/\/)?youtu\.be\/[\w-]{11}/i.test(trimmed)) return true;
  // youtube.com/watch?v=VIDEO_ID
  if (/youtube\.com\/watch\?.*v=[\w-]{11}/i.test(trimmed)) return true;
  // youtube.com/shorts/VIDEO_ID
  if (/youtube\.com\/shorts\/[\w-]{11}/i.test(trimmed)) return true;
  // youtube.com/embed/VIDEO_ID
  if (/youtube\.com\/embed\/[\w-]{11}/i.test(trimmed)) return true;
  // youtube.com/v/VIDEO_ID
  if (/youtube\.com\/v\/[\w-]{11}/i.test(trimmed)) return true;
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
  /** When set externally (e.g. from space detail page), selector is read-only */
  spaceId?: string;
  /** Remove max-width constraint so input stretches to fill parent */
  fullWidth?: boolean;
  /** Disable the input (e.g. while AI is responding) */
  disabled?: boolean;
}

export function PromptInput({ onSubmit, onChat, spaceId: externalSpaceId, fullWidth, disabled }: PromptInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { activeSpaceId, setActiveSpace } = useSpace();

  // Effective spaceId: external prop takes priority, then context
  const spaceId = externalSpaceId ?? activeSpaceId ?? undefined;

  const inputIsVideoUrl = isVideoUrl(input);
  const inputIsSlashCommand = input.trim().startsWith("/");

  // Filter slash commands based on what the user is typing
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

    // Chat mode (text or slash command) — send to AI
    if (!inputIsVideoUrl && onChat) {
      let message = input.trim();

      // Expand slash commands to natural language for the AI
      if (inputIsSlashCommand) {
        const match = SLASH_COMMANDS.find((c) => message.toLowerCase().startsWith(c.command));
        if (match) {
          // Include any extra text the user typed after the command
          const extra = message.slice(match.command.length).trim();
          message = extra ? `${match.hint} ${extra}` : match.hint;
        }
      }

      setInput("");
      onChat(message);
      return;
    }

    // URL mode — existing pipeline flow
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input, spaceId }),
      });

      const data = await res.json();

      if (res.status === 409 && data.existingRunId) {
        if (data.alreadyComplete) {
          const retryRes = await fetch("/api/runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: input, spaceId, force: true }),
          });
          const retryData = await retryRes.json();
          if (retryRes.ok) {
            setInput("");
            onSubmit(retryData.runId, input);
          } else {
            setError(retryData.error || "Failed to start pipeline");
          }
        } else {
          setError("This video is already being processed");
        }
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to start pipeline");
      }

      setInput("");
      onSubmit(data.runId, input);
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
    <div className={cn(fullWidth ? "" : "bg-surface-0 px-4 py-3")}>
      {/* Slash command autocomplete dropdown */}
      {matchingCommands.length > 0 && (
        <div className={cn(
          "bg-surface-1 border border-border rounded-xl mb-2 overflow-hidden shadow-elevation-2",
          !fullWidth && "max-w-2xl mx-auto"
        )}>
          {matchingCommands.map((cmd) => (
            <button
              key={cmd.command}
              type="button"
              onClick={() => handleSlashSelect(cmd)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2/50 transition-colors"
            >
              <span className="flex items-center justify-center h-6 w-6 rounded-md bg-accent/10 text-accent flex-shrink-0">
                <Slash className="h-3 w-3" />
              </span>
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">{cmd.command}</span>
                <span className="text-xs text-muted ml-2">{cmd.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={cn(
          "bg-surface-1 border border-border rounded-2xl overflow-hidden shadow-elevation-1 transition-all duration-200 focus-within:border-accent/30 focus-within:shadow-elevation-2",
          !fullWidth && "max-w-2xl mx-auto"
        )}
      >
        {/* Body — input */}
        <div className="px-4 pt-3 pb-2">
          <input
            type="text"
            placeholder={onChat ? "Paste a video URL, type / for commands, or ask anything..." : "Paste a YouTube URL..."}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            disabled={disabled}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted/50 outline-none disabled:opacity-50"
          />
        </div>

        {/* Footer — space selector (left) + mode badge + submit (right) */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40">
          <div className="flex items-center gap-1">
            <SpaceSelector
              value={externalSpaceId ?? activeSpaceId}
              onChange={(id) => {
                if (!externalSpaceId) setActiveSpace(id);
              }}
              readOnly={!!externalSpaceId}
            />
          </div>

          <div className="flex items-center gap-2">
            {mode === "chat" && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-medium">
                {inputIsSlashCommand ? <Slash className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                {inputIsSlashCommand ? "Command" : "AI"}
              </span>
            )}
            <button
              type="submit"
              disabled={loading || disabled || !input.trim()}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 cursor-pointer",
                input.trim() && !loading && !disabled
                  ? "bg-accent text-white hover:bg-accent/90"
                  : "bg-surface-2 text-muted cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "chat" ? (
                <Bot className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <p className={cn("text-xs text-red-400 mt-1.5 px-4", !fullWidth && "max-w-2xl mx-auto")}>{error}</p>
      )}
    </div>
  );
}
