import { NextRequest, NextResponse } from "next/server";
import { getInvestor, canAccess, recordAccess, type Tier } from "@/lib/investors";
import { list } from "@vercel/blob";

// The Tier-1 materials (deck, one-pager, financials) now come live from Google
// Drive via /files/*. Their old Blob-backed slugs return 410 so no stale copy is
// reachable. Map each retired slug to its /files replacement.
const GONE: Record<string, string> = {
  pitch: "deck.pdf",
  "one-pager": "one-pager.pdf",
  financials: "financials.pdf",
};

const DOCS: Record<string, { tier: Tier; storageKey: string; filename: string }> = {
  // Tier 2 (NDA required) — published V1 docs
  "whitepaper":     { tier: "tier2", storageKey: "whitepaper.pdf",     filename: "Malama-Whitepaper-v1.0.pdf" },
  "tokenomics":     { tier: "tier2", storageKey: "tokenomics.pdf",     filename: "Malama-Tokenomics-v1.pdf" },
  "validator-fees": { tier: "tier2", storageKey: "validator-fees.pdf", filename: "Malama-Validator-Fees-v1.pdf" },
  "data-demand":    { tier: "tier2", storageKey: "data-demand.pdf",    filename: "Malama-Data-Demand-Score-v1.pdf" },
  "genesis":        { tier: "tier2", storageKey: "genesis.pdf",        filename: "Malama-Genesis-Pricing-v1.pdf" },
  "pro-forma":      { tier: "tier2", storageKey: "pro-forma.xlsx",     filename: "Malama-Pro-Forma-v2.xlsx" },
  "model":          { tier: "tier2", storageKey: "model.xlsx",         filename: "Malama-Financial-Model.xlsx" },
  // Tier 2 — corporate/legal (uploaded as produced; show "in review" until then)
  "cap-table":      { tier: "tier2", storageKey: "cap-table.xlsx",     filename: "Malama-Cap-Table.xlsx" },
  "coi":            { tier: "tier2", storageKey: "coi.pdf",            filename: "Malama-COI.pdf" },
  "safe":           { tier: "tier2", storageKey: "safe.pdf",           filename: "Malama-SAFE.pdf" },
  "board":          { tier: "tier2", storageKey: "board.pdf",          filename: "Malama-Board-Consents.pdf" },
  "pilot":          { tier: "tier2", storageKey: "pilot.pdf",          filename: "Malama-Pilot-Data.pdf" },
  "pipeline":       { tier: "tier2", storageKey: "pipeline.pdf",       filename: "Malama-Pipeline.pdf" },
};

const PREFIX = "investor-docs/";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const moved = GONE[params.slug];
  if (moved) {
    return NextResponse.json(
      { error: `This document moved. Fetch /files/${moved} from the portal.` },
      { status: 410 },
    );
  }

  const doc = DOCS[params.slug];
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = req.nextUrl.searchParams.get("token") || "";
  const rec = await getInvestor(token);
  if (!rec) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  if (!canAccess(rec, doc.tier)) {
    return NextResponse.json(
      { error: doc.tier === "tier2" ? "NDA required for this document." : "Access denied." },
      { status: 403 }
    );
  }

  recordAccess(token).catch(() => {});

  try {
    const { blobs } = await list({ prefix: PREFIX + doc.storageKey });
    const match = blobs.find((b) => b.pathname === PREFIX + doc.storageKey);
    if (!match) {
      return NextResponse.json(
        { error: "This document is in review and will be available shortly." },
        { status: 404 }
      );
    }
    // Stream the blob through the gate (keeps the raw blob URL private) and set a
    // proper download name from doc.filename. no-store: never cache a gated doc.
    const upstream = await fetch(match.url);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Document temporarily unavailable." }, { status: 502 });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "This document is in review and will be available shortly." },
      { status: 404 }
    );
  }
}
