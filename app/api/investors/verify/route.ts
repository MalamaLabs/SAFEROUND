// app/api/investors/verify/route.ts
// Verifies an access token and returns what the holder may see.
// Called by the access + room pages on load. Records each access for the audit trail.

import { NextRequest, NextResponse } from "next/server";
import { getInvestor, recordAccess, canAccess } from "@/lib/investors";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const rec = await getInvestor(token);

  if (!rec) {
    return NextResponse.json({ valid: false }, { status: 403 });
  }

  // Fire-and-forget access logging
  recordAccess(token).catch(() => {});

  return NextResponse.json({
    valid: true,
    name: rec.name,
    firm: rec.firm,
    tier: rec.tier,
    ndaAccepted: rec.ndaAccepted,
    canTier1: canAccess(rec, "tier1"),
    canTier2: canAccess(rec, "tier2"),
  });
}
