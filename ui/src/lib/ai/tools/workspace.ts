import { z } from "zod";
import { getSpaces, createSpace } from "@/lib/space-store";
import { getEffectiveConfig } from "@/lib/settings-store";
import type { Space } from "@/lib/types";

export const listSpaces = {
  name: "content_list_spaces",
  description: "List all spaces (workspaces). Returns each space's id, name, icon, description, and account/creator counts.",
  inputSchema: z.object({}),
  execute: async () => {
    const spaces = await getSpaces();
    return spaces.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      description: s.description,
      accountCount: s.accounts?.length ?? 0,
      creatorCount: s.creators?.length ?? 0,
    }));
  },
};

export const createSpaceTool = {
  name: "content_create_space",
  description: "Create a new space (workspace) with a name, optional icon emoji, and optional description.",
  inputSchema: z.object({
    name: z.string().describe("Name of the space"),
    icon: z.string().optional().describe("Emoji icon for the space (e.g. '🎮'). Defaults to '📁'"),
    description: z.string().optional().describe("Short description of the space"),
  }),
  execute: async ({ name, icon, description }: { name: string; icon?: string; description?: string }) => {
    const now = new Date().toISOString();
    const space: Space = {
      id: crypto.randomUUID(),
      name,
      icon: icon || "📁",
      description: description || "",
      settings: {},
      accounts: [],
      creators: [],
      createdAt: now,
      updatedAt: now,
    };
    await createSpace(space);
    return { success: true, id: space.id, name: space.name, icon: space.icon };
  },
};

export const getSettings = {
  name: "content_get_settings",
  description: "Get the current app settings including model, default quality, platforms, niche, and more.",
  inputSchema: z.object({}),
  execute: async () => {
    const config = await getEffectiveConfig();
    return {
      claudeModel: config.claudeModel,
      defaultQuality: config.defaultQuality,
      defaultMaxClips: config.defaultMaxClips,
      defaultMinScore: config.defaultMinScore,
      defaultMaxDuration: config.defaultMaxDuration,
      defaultPlatforms: config.defaultPlatforms,
      niche: config.niche,
      subtitles: config.subtitles,
      backgroundFillStyle: config.backgroundFillStyle,
      captionMode: config.captionMode,
    };
  },
};
