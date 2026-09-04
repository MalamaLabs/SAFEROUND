// app/api/investors/materials/route.ts
// Returns the current Tier-1 material versions (from Drive) so the access page
// can show a version label on each card. Gated by the access token.

import { NextRequest, NextResponse } from "next/server";
import { getInvestor, canAccess } from "@/lib/investors";
import { listCurrentMaterials, FAMILIES } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const rec = await getInvestor(token);
  if (!rec || !canAccess(rec, "tier1")) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const materials = await listCurrentMaterials();
    const out = Object.fromEntries(
      FAMILIES.map((f) => {
        const m = materials[f];
        return [f, m ? { version: m.version, name: m.name, fallback: m.fallback } : null];
      }),
    );
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ error: "Materials temporarily unavailable." }, { status: 502 });
  }
}
