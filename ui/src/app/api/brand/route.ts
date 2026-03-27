import { NextRequest, NextResponse } from "next/server";
import {
  getBrandProfile,
  saveBrandProfile,
  updateBrandProfile,
  type BrandProfile,
} from "@/lib/brand-store";

/** GET /api/brand — return current brand profile */
export async function GET() {
  const brand = await getBrandProfile();
  return NextResponse.json(brand || {});
}

/** POST /api/brand — scrape a URL and build initial brand profile */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Fetch the page HTML
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SocialsBot/1.0; +https://socials.app)",
        },
        signal: AbortSignal.timeout(10000),
      });
      html = await res.text();
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: 422 }
      );
    }

    // Extract key data from HTML
    const title =
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
    const metaDesc =
      html.match(
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
      )?.[1] || "";
    const ogTitle =
      html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i
      )?.[1] || "";
    const ogDesc =
      html.match(
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i
      )?.[1] || "";
    const keywords =
      html
        .match(
          /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i
        )?.[1]
        ?.split(",")
        .map((k) => k.trim())
        .filter(Boolean) || [];

    // Extract headings
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)]
      .map((m) => m[1]!.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean)
      .slice(0, 5);
    const h2s = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)]
      .map((m) => m[1]!.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean)
      .slice(0, 10);

    // Extract paragraph text for body analysis
    const paragraphs = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gi)]
      .map((m) => m[1]!.replace(/<[^>]*>/g, "").trim())
      .filter((p) => p.length > 20)
      .slice(0, 10);

    // Build initial profile
    const name = ogTitle || title.split(/[|\-–]/)[0]?.trim() || title;
    const tagline = ogDesc || metaDesc || h1s[0] || "";

    const now = new Date().toISOString();
    const profile: BrandProfile = {
      url,
      name,
      tagline: tagline.slice(0, 200),
      tone: "",
      audience: "",
      topics: h2s.slice(0, 5),
      keywords: keywords.slice(0, 10),
      competitors: [],
      contentPillars: h1s.length > 0 ? h1s : h2s.slice(0, 3),
      voiceExamples: paragraphs.slice(0, 3),
      createdAt: now,
      updatedAt: now,
    };

    await saveBrandProfile(profile);

    return NextResponse.json({
      profile,
      extracted: {
        title,
        metaDesc,
        ogTitle,
        ogDesc,
        headings: [...h1s, ...h2s],
        bodySnippets: paragraphs.slice(0, 5),
        keywords,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** PUT /api/brand — partial update of brand profile */
export async function PUT(req: NextRequest) {
  try {
    const updates = await req.json();
    const merged = await updateBrandProfile(updates);
    return NextResponse.json(merged);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
