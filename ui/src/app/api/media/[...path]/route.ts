import { NextRequest, NextResponse } from "next/server";
import { stat, open } from "node:fs/promises";
import path from "node:path";
import { getOutputDir } from "@/lib/paths";

const OUTPUT_DIR = getOutputDir();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filePath = path.join(OUTPUT_DIR, ...segments);

  // Security: ensure path doesn't escape output directory
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(OUTPUT_DIR)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const fileStat = await stat(resolved);
    const fileSize = fileStat.size;

    const ext = path.extname(resolved).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    const range = req.headers.get("range");

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        return new NextResponse("Invalid range", { status: 416 });
      }

      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = await open(resolved, "r");
      const buffer = Buffer.alloc(chunkSize);
      await file.read(buffer, 0, chunkSize, start);
      await file.close();

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": contentType,
        },
      });
    }

    // Full file
    const file = await open(resolved, "r");
    const buffer = Buffer.alloc(fileSize);
    await file.read(buffer, 0, fileSize, 0);
    await file.close();

    return new NextResponse(buffer, {
      headers: {
        "Content-Length": String(fileSize),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
