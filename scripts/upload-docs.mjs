// scripts/upload-docs.mjs
// Uploads everything in ./docs-to-upload to private Vercel Blob under the
// investor-docs/ prefix, so the gated /api/investors/doc/[slug] route can serve them.
//
// Usage:
//   1. Get your Blob token: Vercel → Storage → your Blob store → ".env.local" tab,
//      or Project → Settings → Environment Variables (BLOB_READ_WRITE_TOKEN).
//   2. Run:  BLOB_READ_WRITE_TOKEN=xxx node scripts/upload-docs.mjs
//
// The filename in docs-to-upload MUST match the storageKey in the route's DOCS map
// (e.g. financials.pdf, one-pager.pdf, model.xlsx, cap-table.xlsx, etc.).

import { put } from "@vercel/blob";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const DIR = "docs-to-upload";
const PREFIX = "investor-docs/";

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("Missing BLOB_READ_WRITE_TOKEN. Get it from Vercel → Storage → Blob.");
  process.exit(1);
}

const files = await readdir(DIR);
if (!files.length) {
  console.log("No files in", DIR);
  process.exit(0);
}

for (const name of files) {
  if (name.startsWith(".")) continue;
  const bytes = await readFile(join(DIR, name));
  const pathname = PREFIX + name;
  const { url } = await put(pathname, bytes, {
    access: "public",          // 'public' = unguessable URL; the route gate is the real control
    token,
    addRandomSuffix: false,    // keep the exact pathname so list() finds it by slug
    allowOverwrite: true,
  });
  console.log("uploaded", pathname, "→", url);
}

console.log("\nDone. Files are in private blob under", PREFIX);
