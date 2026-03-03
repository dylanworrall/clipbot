import { readFile, writeFile } from "node:fs/promises";
import { getEffectiveConfig } from "./settings-store";
import { SPACES_FILE } from "./paths";
import type { Space } from "./types";

// Re-export types so existing server imports keep working
export type { SpaceSettings, Space } from "./types";

export async function getSpaces(): Promise<Space[]> {
  try {
    const raw = await readFile(SPACES_FILE, "utf-8");
    return JSON.parse(raw) as Space[];
  } catch {
    return [];
  }
}

export async function getSpace(id: string): Promise<Space | null> {
  const spaces = await getSpaces();
  return spaces.find((s) => s.id === id) ?? null;
}

export async function createSpace(space: Space): Promise<void> {
  const spaces = await getSpaces();
  spaces.unshift(space);
  await writeFile(SPACES_FILE, JSON.stringify(spaces, null, 2), "utf-8");
}

export async function updateSpace(id: string, updates: Partial<Space>): Promise<Space | null> {
  const spaces = await getSpaces();
  const idx = spaces.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  spaces[idx] = { ...spaces[idx], ...updates, updatedAt: new Date().toISOString() };
  await writeFile(SPACES_FILE, JSON.stringify(spaces, null, 2), "utf-8");
  return spaces[idx];
}

export async function removeSpace(id: string): Promise<boolean> {
  const spaces = await getSpaces();
  const filtered = spaces.filter((s) => s.id !== id);
  if (filtered.length === spaces.length) return false;
  await writeFile(SPACES_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}

/** Merge space overrides on top of global settings */
export async function getSpaceEffectiveSettings(id: string) {
  const space = await getSpace(id);
  if (!space) return null;

  const global = await getEffectiveConfig();

  // Strip undefined values from space settings and shallow-merge
  const overrides: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(space.settings)) {
    if (value === undefined) continue;
    overrides[key] = value;
  }

  const merged = { ...global, ...overrides };

  // Deep-merge captionStyle
  if (space.settings.captionStyle && global.captionStyle) {
    merged.captionStyle = { ...global.captionStyle, ...space.settings.captionStyle };
  }

  // Deep-merge scoringWeights
  if (space.settings.scoringWeights && global.scoringWeights) {
    merged.scoringWeights = { ...global.scoringWeights, ...space.settings.scoringWeights };
  }

  return merged;
}
