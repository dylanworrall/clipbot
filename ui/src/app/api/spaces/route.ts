import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSpaces, createSpace } from "@/lib/space-store";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

export async function GET() {
  if (isConvexMode()) {
    const convex = getConvexClient()!;
    let spaces = await convex.query(api.spaces.list, {});
    if (spaces.length === 0) {
      await convex.mutation(api.spaces.seed, {});
      spaces = await convex.query(api.spaces.list, {});
    }
    return NextResponse.json(spaces);
  }

  let spaces = await getSpaces();

  // Auto-create a default space if none exist
  if (spaces.length === 0) {
    const defaultSpace = {
      id: randomUUID().slice(0, 8),
      name: "Default",
      description: "",
      icon: "",
      settings: {},
      accounts: [],
      creators: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createSpace(defaultSpace);
    spaces = [defaultSpace];
  }

  return NextResponse.json(spaces);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, icon, niche } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const id = await convex.mutation(api.spaces.create, { name, description, icon, niche });
    return NextResponse.json({ _id: id, name }, { status: 201 });
  }

  const space = {
    id: randomUUID().slice(0, 8),
    name,
    description: description ?? "",
    icon: icon ?? "",
    settings: {
      ...(niche && { niche }),
    },
    accounts: [],
    creators: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await createSpace(space);
  return NextResponse.json(space, { status: 201 });
}
