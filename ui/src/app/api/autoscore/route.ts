import { NextResponse } from "next/server";
import {
  getReport,
  collectFeedback,
  runLearningCycle,
  updateAutoScoreConfig,
} from "@/lib/autoscore-store";
import type { AutoScoreConfig } from "@/lib/autoscore-store";

// GET /api/autoscore — return full report
export async function GET() {
  try {
    const report = await getReport();
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/autoscore — collect feedback + run learning cycle
// body: { action: "collect" | "learn" | "collect_and_learn" | "update_config", config?: Partial<AutoScoreConfig> }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "update_config") {
      const config = await updateAutoScoreConfig(body.config as Partial<AutoScoreConfig>);
      return NextResponse.json({ config });
    }

    if (action === "collect") {
      const result = await collectFeedback();
      return NextResponse.json({ action: "collect", ...result });
    }

    if (action === "learn") {
      const update = await runLearningCycle();
      return NextResponse.json({ action: "learn", update });
    }

    if (action === "collect_and_learn") {
      const collectResult = await collectFeedback();
      let update = null;
      let learnError = null;

      try {
        update = await runLearningCycle();
      } catch (err) {
        learnError = err instanceof Error ? err.message : "Learning failed";
      }

      return NextResponse.json({
        action: "collect_and_learn",
        collected: collectResult.collected,
        skipped: collectResult.skipped,
        errors: collectResult.errors,
        update,
        learnError,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
