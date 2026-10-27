import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { gameSaves } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync progress." }, { status: 401 });
  const row = await getDb().select().from(gameSaves).where(eq(gameSaves.userId, user.userId)).get();
  return NextResponse.json({ save: row?.save ?? null, updatedAt: row?.updatedAt ?? null });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync progress." }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "Save is too large." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid save." }, { status: 400 }); }
  const value = body && typeof body === "object" ? body as { version?: unknown; save?: unknown } : null;
  if (value?.version !== 1 || typeof value.save !== "string" || !value.save.includes("!END!") || value.save.length > 1_500_000) {
    return NextResponse.json({ error: "Invalid save." }, { status: 400 });
  }
  const updatedAt = Date.now();
  await getDb().insert(gameSaves).values({ userId: user.userId, save: value.save, updatedAt })
    .onConflictDoUpdate({ target: gameSaves.userId, set: { save: value.save, updatedAt } });
  return NextResponse.json({ ok: true, updatedAt });
}
