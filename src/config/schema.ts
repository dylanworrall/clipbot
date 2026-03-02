import { z } from "zod";

const PlatformSchema = z.enum(["tiktok", "youtube", "instagram"]);

export const BackgroundFillStyleSchema = z.enum([
  "center-crop",
  "blurred-zoom",
  "mirror-reflection",
  "split-fill",
]);

const ScoringWeightsSchema = z.object({
  hook: z.number().nonnegative(),
  standalone: z.number().nonnegative(),
  controversy: z.number().nonnegative(),
  education: z.number().nonnegative(),
  emotion: z.number().nonnegative(),
  twist: z.number().nonnegative(),
  quotable: z.number().nonnegative(),
  visual: z.number().nonnegative(),
  nicheBonus: z.number().nonnegative(),
}).partial();

export const ConfigFileSchema = z.object({
  cookiesFile: z.string().optional(),
  claudeModel: z.string().optional(),
  claudeTemperature: z.number().min(0).max(1).optional(),
  accounts: z.record(z.string(), z.string()).optional(),
  defaultQuality: z.string().optional(),
  defaultMaxClips: z.number().int().positive().optional(),
  defaultMinScore: z.number().int().min(1).max(10).optional(),
  defaultMaxDuration: z.number().int().positive().optional(),
  outputDir: z.string().optional(),
  niche: z.string().optional(),
  subtitles: z.boolean().optional(),
  padBefore: z.number().nonnegative().optional(),
  padAfter: z.number().nonnegative().optional(),
  defaultPlatforms: z.array(PlatformSchema).optional(),
  backgroundFillStyle: BackgroundFillStyleSchema.optional(),
  captionMode: z.enum(["overlay", "burn-in"]).optional(),
  scoringWeights: ScoringWeightsSchema.optional(),
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;
