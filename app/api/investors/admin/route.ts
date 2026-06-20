// app/api/investors/admin/route.ts
// Returns the investor list for the admin dashboard. Protected by ADMIN_KEY.
// Uses constant-time comparison to avoid timing attacks on the key.

import { NextRequest, NextResponse } from "next/server";
import { listInvestors } from "@/lib/investors";
import { timingSafeEqual } from "crypto";

function keyValid(provided: string): boolean {
  const expected = process.env.INVESTOR_ADMIN_KEY || "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || "";
  if (!keyValid(key)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const investors = await listInvestors();
  return NextResponse.json({ investors });
}
