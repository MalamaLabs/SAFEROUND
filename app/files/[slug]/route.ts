// app/files/[slug]/route.ts
// Serves the current Tier-1 materials straight from the shared Google Drive
// folder, so uploading a new version to Drive updates the portal with no
// redeploy. Gated by the investor access token (?token=), same as the rest of
// the portal. Streams the file with the Drive filename in Content-Disposition.
//
//   /files/deck.pdf         -> current Malama_Seed_Deck_vX_Y.pdf
//   /files/one-pager.pdf    -> current Malama_Labs_One_Pager_vN.pdf
//   /files/financials.pdf   -> current Malama_Labs_Investor_Financials_vN.pdf

import { NextRequest, NextResponse } from "next/server";
import { getInvestor, canAccess, recordAccess } from "@/lib/investors";
import { listCurrentMaterials, downloadFile, type Family } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_TO_FAMILY: Record<string, Family> = {
  "deck.pdf": "deck",
  "one-pager.pdf": "onePager",
  "financials.pdf": "financials",
};

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const family = SLUG_TO_FAMILY[params.slug];
  if (!family) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Tier 1 gate: any valid access token may view these materials.
  const token = req.nextUrl.searchParams.get("token") || "";
  const rec = await getInvestor(token);
  if (!rec) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  if (!canAccess(rec, "tier1")) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }
  recordAccess(token).catch(() => {});

  let material;
  try {
    const materials = await listCurrentMaterials();
    material = materials[family];
  } catch {
    return NextResponse.json({ error: "Materials are temporarily unavailable." }, { status: 502 });
  }
  if (!material) {
    return NextResponse.json({ error: "This document is unavailable." }, { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await downloadFile(material.id);
  } catch {
    return NextResponse.json({ error: "This document is temporarily unavailable." }, { status: 502 });
  }

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${material.name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
