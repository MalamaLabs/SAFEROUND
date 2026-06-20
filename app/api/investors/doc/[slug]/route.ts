// app/api/investors/doc/[slug]/route.ts
// Serves gated documents from private Vercel Blob storage.
// Every request re-checks token + tier before streaming the file.
// Files live in PRIVATE blob, reachable ONLY through this checked route.
// Tier-2 docs require an accepted NDA.

import { NextRequest, NextResponse } from "next/server";
import { getInvestor, canAccess, recordAccess, type Tier } from "@/lib/investors";
import { list } from "@vercel/blob";

// slug -> { tier, storageKey, filename }
const DOCS: Record<string, { tier: Tier; storageKey: string; filename: string }> = {
  // Tier 1 (open to any valid token)
  "pitch":        { tier: "tier1", storageKey: "pitch.pdf",        filename: "Malama-Pitch-Deck.pdf" },
  "one-pager":    { tier: "tier1", storageKey: "one-pager.pdf",    filename: "Malama-One-Pager.pdf" },
  "financials":   { tier: "tier1", storageKey: "financials.pdf",   filename: "Malama-Investor-Financials.pdf" },
  // Tier 2 (NDA required)
  "model":        { tier: "tier2", storageKey: "model.xlsx",       filename: "Malama-Financial-Model.xlsx" },
  "pro-forma":    { tier: "tier2", storageKey: "pro-forma.xlsx",   filename: "Malama-Pro-Forma.xlsx" },
  "cap-table":    { tier: "tier2", storageKey: "cap-table.xlsx",   filename: "Malama-Cap-Table.xlsx" },
  "coi":          { tier: "tier2", storageKey: "coi.pdf",          filename: "Malama-COI.pdf" },
  "safe":         { tier: "tier2", storageKey: "safe.pdf",         filename: "Malama-SAFE.pdf" },
  "board":        { tier: "tier2", storageKey: "board.pdf",        filename: "Malama-Board-Consents.pdf" },
  "whitepaper":   { tier: "tier2", storageKey: "whitepaper.pdf",   filename: "Malama-Whitepaper.pdf" },
  "markets":      { tier: "tier2", storageKey: "markets.pdf",      filename: "Malama-Markets.pdf" },
  "pilot":        { tier: "tier2", storageKey: "pilot.pdf",        filename: "Malama-Pilot-Data.pdf" },
  "hardware":     { tier: "tier2", storageKey: "hardware.pdf",     filename: "Malama-Hardware-Spec.pdf" },
  "pipeline":     { tier: "tier2", storageKey: "pipeline.pdf",     filename: "Malama-Pipeline.pdf" },
  "registry":     { tier: "tier2", storageKey: "registry.pdf",     filename: "Malama-Registry.pdf" },
  "genesis":      { tier: "tier2", storageKey: "genesis.pdf",      filename: "Malama-Genesis-200.pdf" },
  "use-of-funds": { tier: "tier2", storageKey: "use-of-funds.pdf", filename: "Malama-Use-of-Funds.pdf" },
  "comps":        { tier: "tier2", storageKey: "comps.pdf",        filename: "Malama-DePIN-Comps.pdf" },
};

const PREFIX = "investor-docs/";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
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

  // Audit-log the document access
  recordAccess(token).catch(() => {});

  // Find the file in private blob by its prefixed path.
  try {
    const { blobs } = await list({ prefix: PREFIX + doc.storageKey });
    const match = blobs.find((b) => b.pathname === PREFIX + doc.storageKey);

    if (!match) {
      return NextResponse.json(
        { error: "This document is being prepared and will be available shortly." },
        { status: 404 }
      );
    }

    return NextResponse.redirect(match.url);
  } catch (e) {
    console.error("doc serve error", e);
    return NextResponse.json({ error: "Could not load document." }, { status: 500 });
  }
}
