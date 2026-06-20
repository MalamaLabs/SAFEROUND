// app/api/investors/doc/[slug]/route.ts
// Serves gated documents. Every file request re-checks the token and tier.
// Tier-2 docs require an NDA-accepted token. Files live outside /public so they
// can ONLY be reached through this checked route, never by direct URL.
//
// Store the actual files in a private location (e.g. a private Vercel Blob store,
// S3 with signed URLs, or /protected-docs not served statically). This route maps
// a slug -> file and a required tier, verifies, then redirects to a short-lived
// signed URL or streams the bytes.

import { NextRequest, NextResponse } from "next/server";
import { getInvestor, canAccess, recordAccess, type Tier } from "@/lib/investors";

// slug -> { tier, storageKey }. Tier gates which docs need an NDA.
const DOCS: Record<string, { tier: Tier; storageKey: string; filename: string }> = {
  // Tier 1 (open to any valid token)
  "pitch":        { tier: "tier1", storageKey: "pitch.pdf",        filename: "Malama-Pitch-Deck.pdf" },
  "one-pager":    { tier: "tier1", storageKey: "one-pager.pdf",    filename: "Malama-One-Pager.pdf" },
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

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  const doc = DOCS[slug];
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

  // Log the document access for the audit trail
  recordAccess(token).catch(() => {});

  // OPTION A (recommended): redirect to a short-lived signed URL from your
  // private blob store. Pseudocode — wire to your store:
  //
  //   const signed = await blob.getSignedUrl(doc.storageKey, { expiresIn: 120 });
  //   return NextResponse.redirect(signed);
  //
  // OPTION B: stream bytes from a private path (not under /public):
  //   const bytes = await readPrivateFile(doc.storageKey);
  //   return new NextResponse(bytes, { headers: {
  //     "Content-Type": "application/pdf",
  //     "Content-Disposition": `inline; filename="${doc.filename}"`,
  //     "Cache-Control": "private, no-store",
  //   }});

  const signedUrlBase = process.env.PRIVATE_DOC_BASE_URL; // e.g. signed blob endpoint
  if (signedUrlBase) {
    const url = `${signedUrlBase}/${doc.storageKey}`;
    return NextResponse.redirect(url);
  }

  // Dev fallback: explain wiring
  return NextResponse.json({
    ok: true,
    note: "Wire PRIVATE_DOC_BASE_URL or implement Option A/B to serve files.",
    doc: doc.filename,
    tier: doc.tier,
  });
}
