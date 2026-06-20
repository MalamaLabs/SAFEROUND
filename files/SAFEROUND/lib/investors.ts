// lib/investors.ts
// Investor portal core: access tokens, tiered gating, NDA records.
// Uses the existing Upstash Redis client already wired in the Launch monorepo.
// Drop-in: matches the existing lib/db.ts @upstash/redis pattern.

import { Redis } from "@upstash/redis";
import { randomBytes, createHash } from "crypto";

const redis = Redis.fromEnv();

// ── Access tiers ────────────────────────────────────────────────────────────
export type Tier = "tier1" | "tier2";
// tier1 = pitch deck + one-pager + interactive financials (no NDA)
// tier2 = full model + data room (NDA required)

export interface InvestorRecord {
  id: string;              // access token (opaque, 32-byte hex)
  name: string;
  email: string;
  firm: string;
  role?: string;
  fundSize?: string;
  message?: string;
  tier: Tier;
  ndaAccepted: boolean;
  ndaAcceptedAt?: string;  // ISO timestamp
  ndaIp?: string;          // captured at acceptance
  ndaUserAgent?: string;
  ndaVersion?: string;     // version of the NDA text accepted
  createdAt: string;
  lastAccessAt?: string;
  accessCount: number;
  source?: string;         // utm / referral
}

const KEY = (id: string) => `investor:${id}`;
const EMAIL_INDEX = (email: string) =>
  `investor:email:${createHash("sha256").update(email.toLowerCase().trim()).digest("hex")}`;
const ALL_SET = "investor:all";

// Current NDA version. Bump when the NDA text changes so old acceptances
// are distinguishable from new ones.
export const NDA_VERSION = "v1.0-2026-06";

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createInvestor(input: {
  name: string;
  email: string;
  firm: string;
  role?: string;
  fundSize?: string;
  message?: string;
  source?: string;
}): Promise<InvestorRecord> {
  // De-dupe by email: if they already requested, return existing token
  const existingId = await redis.get<string>(EMAIL_INDEX(input.email));
  if (existingId) {
    const existing = await getInvestor(existingId);
    if (existing) return existing;
  }

  const id = newToken();
  const rec: InvestorRecord = {
    id,
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    firm: input.firm.trim(),
    role: input.role?.trim(),
    fundSize: input.fundSize?.trim(),
    message: input.message?.trim(),
    tier: "tier1",                 // auto-approve to tier1 on submit
    ndaAccepted: false,
    createdAt: new Date().toISOString(),
    accessCount: 0,
    source: input.source,
  };

  await redis.set(KEY(id), JSON.stringify(rec));
  await redis.set(EMAIL_INDEX(input.email), id);
  await redis.sadd(ALL_SET, id);
  return rec;
}

export async function getInvestor(id: string): Promise<InvestorRecord | null> {
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return null; // strict token shape
  const raw = await redis.get<string>(KEY(id));
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as InvestorRecord);
  } catch {
    return null;
  }
}

export async function recordAccess(id: string): Promise<void> {
  const rec = await getInvestor(id);
  if (!rec) return;
  rec.lastAccessAt = new Date().toISOString();
  rec.accessCount = (rec.accessCount || 0) + 1;
  await redis.set(KEY(id), JSON.stringify(rec));
}

export async function acceptNDA(
  id: string,
  meta: { ip: string; userAgent: string }
): Promise<InvestorRecord | null> {
  const rec = await getInvestor(id);
  if (!rec) return null;

  rec.ndaAccepted = true;
  rec.ndaAcceptedAt = new Date().toISOString();
  rec.ndaIp = meta.ip;
  rec.ndaUserAgent = meta.userAgent;
  rec.ndaVersion = NDA_VERSION;
  rec.tier = "tier2"; // NDA acceptance unlocks tier2

  await redis.set(KEY(id), JSON.stringify(rec));

  // Append an immutable audit log entry (separate key, never overwritten)
  await redis.lpush(
    `investor:nda-log`,
    JSON.stringify({
      investorId: id,
      email: rec.email,
      firm: rec.firm,
      acceptedAt: rec.ndaAcceptedAt,
      ip: meta.ip,
      userAgent: meta.userAgent,
      ndaVersion: NDA_VERSION,
    })
  );

  return rec;
}

export async function listInvestors(): Promise<InvestorRecord[]> {
  const ids = (await redis.smembers(ALL_SET)) as string[];
  if (!ids?.length) return [];
  const recs = await Promise.all(ids.map((id: string) => getInvestor(id)));
  return recs
    .filter((r): r is InvestorRecord => r !== null)
    .sort((a: InvestorRecord, b: InvestorRecord) => b.createdAt.localeCompare(a.createdAt));
}

// Whether a given investor may view a given tier
export function canAccess(rec: InvestorRecord | null, tier: Tier): boolean {
  if (!rec) return false;
  if (tier === "tier1") return true;          // any valid token sees tier1
  if (tier === "tier2") return rec.ndaAccepted; // tier2 requires NDA
  return false;
}
