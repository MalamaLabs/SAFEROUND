// app/api/investors/redeem/route.ts
// Redeems an access code and grants Tier 1. Accepts, in order:
//   1. INVESTOR_PASSWORD  — a shared password (optional)
//   2. INVESTOR_CODES     — env JSON map { code: "Label" } (optional)
//   3. invcode:{code}     — per-investor code minted by the admin send tool,
//                           stored in the same Upstash Redis as { label, email, ... }
// On success it mints (or reuses) an investor token and returns the access link.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createInvestor } from "@/lib/investors";

export const runtime = "nodejs";

const redis = Redis.fromEnv();

// Per-IP rate limit to deter code guessing: 10 / hour.
async function rateLimited(ip: string): Promise<boolean> {
  const key = `ratelimit:investor-redeem:${ip}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 3600);
  return n > 10;
}

// "Name (Firm)" -> { name, firm }
function splitLabel(label: string): { name: string; firm: string } {
  const m = label.match(/^\s*(.*?)\s*\((.*)\)\s*$/);
  if (m) return { name: m[1].trim(), firm: m[2].trim() };
  return { name: label.trim(), firm: "" };
}

interface InvCode {
  label?: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (await rateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!code) {
      return NextResponse.json({ error: "Enter your access code." }, { status: 400 });
    }

    let grant: { name: string; firm: string; email: string } | null = null;

    // 1. Shared password
    if (process.env.INVESTOR_PASSWORD && code === process.env.INVESTOR_PASSWORD) {
      grant = { name: "Investor", firm: "Access code", email: "shared@codes.investors.malamalabs.com" };
    }

    // 2. INVESTOR_CODES env map
    if (!grant) {
      let codes: Record<string, string> = {};
      try {
        codes = JSON.parse(process.env.INVESTOR_CODES || "{}");
      } catch {
        codes = {};
      }
      if (Object.prototype.hasOwnProperty.call(codes, code)) {
        const { name, firm } = splitLabel(String(codes[code]));
        grant = { name, firm, email: `${code}@codes.investors.malamalabs.com` };
      }
    }

    // 3. invcode:{code} from the admin send tool
    if (!grant) {
      const rec = await redis.get<InvCode | string>(`invcode:${code}`);
      const inv: InvCode | null =
        typeof rec === "string" ? (JSON.parse(rec) as InvCode) : rec || null;
      if (inv) {
        const { name, firm } = splitLabel(inv.label || "Investor");
        grant = {
          name,
          firm,
          email: inv.email || `${code}@codes.investors.malamalabs.com`,
        };
      }
    }

    if (!grant) {
      return NextResponse.json({ error: "That code isn't valid." }, { status: 401 });
    }

    const investor = await createInvestor({
      name: grant.name,
      email: grant.email,
      firm: grant.firm,
      source: `code:${code}`,
    });

    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://malamalabs.com";
    return NextResponse.json({
      ok: true,
      token: investor.id,
      accessLink: `${base}/investors/access?token=${investor.id}`,
    });
  } catch (e) {
    console.error("investor redeem error", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
