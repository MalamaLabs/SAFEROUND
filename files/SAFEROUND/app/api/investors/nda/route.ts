// app/api/investors/nda/route.ts
// Records click-to-accept NDA with timestamp + IP + user agent.
// On success, the investor is promoted to Tier 2 (model + data room).

import { NextRequest, NextResponse } from "next/server";
import { acceptNDA, getInvestor } from "@/lib/investors";

export async function POST(req: NextRequest) {
  try {
    const { token, agree } = await req.json();

    if (!token || agree !== true) {
      return NextResponse.json(
        { error: "You must check the box to accept the NDA." },
        { status: 400 }
      );
    }

    const rec = await getInvestor(token);
    if (!rec) {
      return NextResponse.json({ error: "Invalid or expired access link." }, { status: 403 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const updated = await acceptNDA(token, { ip, userAgent });
    if (!updated) {
      return NextResponse.json({ error: "Could not record acceptance." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      tier: updated.tier,
      acceptedAt: updated.ndaAcceptedAt,
      message: "NDA accepted. Full model and data room unlocked.",
    });
  } catch (e) {
    console.error("nda accept error", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
