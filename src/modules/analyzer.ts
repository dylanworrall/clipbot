import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AnalysisResponseSchema, type ViralMoment } from "../types/clip.js";
import type { AnalysisOptions, ScoringWeights } from "../types/pipeline.js";
import { log } from "../utils/logger.js";
import { retry } from "../utils/retry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_WEIGHTS: ScoringWeights = {
  hook: 3,
  standalone: 3,
  controversy: 3,
  education: 3,
  emotion: 1.5,
  twist: 1.5,
  quotable: 1,
  visual: 1,
  nicheBonus: 1,
};

function buildScoringSection(weights: ScoringWeights): string {
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  const lines: string[] = [];

  const primary = [
    { key: "hook", label: "Strong Hook", weight: w.hook, desc: "The first 2 seconds must grab attention. Look for surprising statements, provocative questions, bold claims, or \"wait what?\" moments. A weak hook = dead clip regardless of content quality." },
    { key: "standalone", label: "Standalone Value", weight: w.standalone, desc: "The clip MUST make complete sense without any prior context. A viewer scrolling their feed should immediately understand what's happening. If it requires setup from earlier in the video, skip it." },
    { key: "controversy", label: "Controversy/Debate", weight: w.controversy, desc: "Polarizing opinions, hot takes, or statements that will split the comments. \"This is the best X on the planet\" or \"Everyone's doing this wrong\" — anything that makes people NEED to comment their opinion." },
    { key: "education", label: "Educational Nuggets", weight: w.education, desc: "\"I didn't know that\" moments. Specific numbers, techniques, insider knowledge, or expert tips that make viewers feel like they learned something valuable in under 60 seconds." },
  ];

  const secondary = [
    { key: "emotion", label: "Emotional Peaks", weight: w.emotion, desc: "Genuine moments of excitement, shock, pride, frustration, or passion. The speaker's energy must be high — monotone delivery kills virality." },
    { key: "twist", label: "Unexpected Twists", weight: w.twist, desc: "Surprising reveals, counterintuitive facts, before/after contrasts, or moments where the outcome defies expectations." },
  ];

  const tertiary = [
    { key: "quotable", label: "Quotable Lines", weight: w.quotable, desc: "Memorable one-liners people would share, stitch, or use as audio." },
    { key: "visual", label: "Visual Cue Potential", weight: w.visual, desc: "When the transcript references something visually impressive, the actual video is likely compelling even though you can only read the transcript." },
  ];

  for (const group of [primary, secondary, tertiary]) {
    for (const c of group) {
      lines.push(`- **${c.label} (${c.weight}x)**: ${c.desc}`);
    }
  }

  return lines.join("\n");
}

function buildScoringFormula(weights: ScoringWeights): string {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const divisor = w.hook + w.standalone + w.controversy + w.education + w.emotion + w.twist + w.quotable + w.visual;
  return `(hook*${w.hook} + standalone*${w.standalone} + controversy*${w.controversy} + education*${w.education} + emotion*${w.emotion} + twist*${w.twist} + quotable*${w.quotable} + visual*${w.visual}) / ${divisor}`;
}

async function getSystemPrompt(niche?: string, scoringWeights?: ScoringWeights): Promise<string> {
  const promptPath = path.resolve(__dirname, "../../prompts/viral-moments.md");
  let prompt = await readFile(promptPath, "utf-8");

  const weights = { ...DEFAULT_WEIGHTS, ...scoringWeights };
  prompt = prompt.replace("{{SCORING_WEIGHTS}}", buildScoringSection(weights));
  prompt = prompt.replace("{{SCORING_FORMULA}}", buildScoringFormula(weights));

  if (niche) {
    try {
      const nichePath = path.resolve(__dirname, `../../prompts/niches/${niche}.md`);
      const nicheInstructions = await readFile(nichePath, "utf-8");
      const bonusNote = weights.nicheBonus !== 1
        ? nicheInstructions.replace(/\+1 to final score/g, `+${weights.nicheBonus} to final score`)
        : nicheInstructions;
      prompt = prompt.replace("{{NICHE_INSTRUCTIONS}}", bonusNote);
    } catch {
      prompt = prompt.replace("{{NICHE_INSTRUCTIONS}}", "No niche-specific scoring for this video. Apply general viral criteria only.");
    }
  } else {
    prompt = prompt.replace("{{NICHE_INSTRUCTIONS}}", "No niche-specific scoring for this video. Apply general viral criteria only.");
  }

  return prompt;
}

export async function analyzeTranscript(
  transcript: string,
  videoTitle: string,
  apiKey: string,
  options: AnalysisOptions
): Promise<ViralMoment[]> {
  const systemPrompt = await getSystemPrompt(options.niche, options.scoringWeights);

  const userMessage = `Video Title: "${videoTitle}"

Find the top ${options.maxClips} most viral-worthy moments. Only include moments with a virality score of ${options.minScore} or higher. Each clip should be at most ${options.maxDuration} seconds.

TRANSCRIPT:
${transcript}`;

  log.debug(`Sending ${transcript.length} chars to ${options.model}`);

  const response = await retry(
    async () => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: {
              temperature: options.temperature ?? 0.2,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${err}`);
      }

      const data = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const cleaned = text
        .replace(/^```(?:json)?\s*\n?/m, "")
        .replace(/\n?```\s*$/m, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      return AnalysisResponseSchema.parse(parsed);
    },
    {
      maxAttempts: 2,
      onRetry: (attempt) =>
        log.warn(`Gemini response parse failed, retrying (attempt ${attempt + 1})...`),
    }
  );

  const moments = response.moments
    .filter((m) => m.viralityScore >= options.minScore)
    .filter((m) => m.durationSeconds <= options.maxDuration)
    .sort((a, b) => b.viralityScore - a.viralityScore)
    .slice(0, options.maxClips);

  log.debug(
    `Analysis complete: ${response.moments.length} found, ${moments.length} passed filters`
  );

  return moments;
}
