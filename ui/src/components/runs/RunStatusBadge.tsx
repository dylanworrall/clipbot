import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; variant: "green" | "gold" | "red" | "blue" | "default" }> = {
  downloading: { label: "Downloading", variant: "blue" },
  transcribing: { label: "Transcribing", variant: "blue" },
  analyzing: { label: "Analyzing", variant: "blue" },
  clipping: { label: "Clipping", variant: "gold" },
  publishing: { label: "Publishing", variant: "gold" },
  complete: { label: "Complete", variant: "green" },
  failed: { label: "Failed", variant: "red" },
};

export function RunStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
