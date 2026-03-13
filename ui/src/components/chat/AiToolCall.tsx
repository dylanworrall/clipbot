"use client";

import type { ToolUIPart, DynamicToolUIPart } from "ai";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

const TOOL_TITLES: Record<string, string> = {
  list_spaces: "List Spaces",
  create_space: "Create Space",
  get_runs: "Get Runs",
  schedule_clip: "Schedule Clip",
  list_scheduled: "List Scheduled Posts",
  list_creators: "List Creators",
  add_creator: "Add Creator",
  get_settings: "Get Settings",
  process_video: "Process Video",
  get_run_detail: "Get Run Details",
  get_clips: "Get Clips",
  check_creator_videos: "Check Creator Videos",
  publish_clip: "Publish Clip",
  list_posts: "List Posts",
  get_post_analytics: "Post Analytics",
  update_post: "Update Post",
  delete_post: "Delete Post",
  list_accounts: "List Accounts",
  get_notifications: "Get Notifications",
  remove_creator: "Remove Creator",
  cancel_run: "Cancel Run",
  cancel_scheduled: "Cancel Scheduled Post",
  autoscore_status: "AutoScore Status",
  autoscore_learn: "AutoScore Learn",
};

function getToolName(part: ToolUIPart | DynamicToolUIPart): string {
  if (part.type === "dynamic-tool") return part.toolName;
  // ToolUIPart type is "tool-<name>"
  return part.type.startsWith("tool-") ? part.type.slice(5) : part.type;
}

interface AiToolCallProps {
  part: ToolUIPart | DynamicToolUIPart;
}

export function AiToolCall({ part }: AiToolCallProps) {
  const name = getToolName(part);
  const title = TOOL_TITLES[name] ?? name;
  const hasOutput = part.state === "output-available" || part.state === "output-error";

  const headerProps =
    part.type === "dynamic-tool"
      ? { type: "dynamic-tool" as const, state: part.state, toolName: (part as DynamicToolUIPart).toolName, title }
      : { type: part.type as `tool-${string}`, state: part.state, title };

  return (
    <Tool defaultOpen={hasOutput}>
      <ToolHeader {...headerProps} />
      <ToolContent>
        {part.input != null && Object.keys(part.input as object).length > 0 ? (
          <ToolInput input={part.input as Record<string, unknown>} />
        ) : null}
        {hasOutput ? (
          <ToolOutput
            output={part.state === "output-available" ? (part.output as Record<string, unknown>) : undefined}
            errorText={part.state === "output-error" ? (part as ToolUIPart).errorText : undefined}
          />
        ) : null}
      </ToolContent>
    </Tool>
  );
}
