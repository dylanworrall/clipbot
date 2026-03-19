import { z } from "zod";
import { getReport as getAutoScoreReport, collectFeedback, runLearningCycle } from "@/lib/autoscore-store";

export const autoscoreStatus = {
  name: "content_autoscore_status",
  description: "View AutoScore learning status: prediction accuracy, correlation, category breakdown, and recent weight adjustments.",
  inputSchema: z.object({}),
  execute: async () => {
    const report = await getAutoScoreReport();
    return {
      enabled: report.config.enabled,
      learningRate: report.config.learningRate,
      totalFeedback: report.totalFeedback,
      correlation: report.correlation,
      meanError: report.meanError,
      categoryBreakdown: report.categoryBreakdown,
      recentUpdates: report.updates.slice(0, 5).map((u) => ({ timestamp: u.timestamp, accepted: u.accepted, correlation: u.correlation, sampleSize: u.sampleSize, adjustments: u.adjustments })),
    };
  },
};

export const autoscoreLearn = {
  name: "content_autoscore_learn",
  description: "Run an AutoScore learning cycle: collects analytics, compares predicted vs actual engagement, and adjusts scoring weights.",
  inputSchema: z.object({}),
  execute: async () => {
    const collectResult = await collectFeedback();
    let update = null;
    let learnError = null;
    try {
      update = await runLearningCycle();
    } catch (err) {
      learnError = err instanceof Error ? err.message : "Learning failed";
    }
    return {
      collected: collectResult.collected, skipped: collectResult.skipped, errors: collectResult.errors.slice(0, 5),
      update: update ? { accepted: update.accepted, correlation: update.correlation, meanError: update.meanError, sampleSize: update.sampleSize, adjustments: update.adjustments } : null,
      learnError,
    };
  },
};
