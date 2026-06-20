// app/api/investors/request/route.ts
// Handles the "Request Access" form. Auto-approves to Tier 1, returns an
// access link, and notifies the founders. Rate-limited per IP.

import { NextRequest, NextResponse } from "next/server";
import { createInvestor } from "@/lib/investors";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Basic per-IP rate limit: 5 requests / hour
async function rateLimited(ip: string): Promise<boolean> {
  const key = `ratelimit:investor-request:${ip}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 3600);
  return n > 5;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Block obvious throwaway domains to keep the list clean (extend as needed)
const BLOCKED_DOMAINS = ["mailinator.com", "guerrillamail.com", "10minutemail.com"];

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (await rateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, firm, role, fundSize, message, source } = body || {};

    if (!name || !email || !firm) {
      return NextResponse.json(
        { error: "Name, email, and firm are required." },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }
    const domain = email.split("@")[1]?.toLowerCase();
    if (BLOCKED_DOMAINS.includes(domain)) {
      return NextResponse.json(
        { error: "Please use a work or permanent email address." },
        { status: 400 }
      );
    }

    const rec = await createInvestor({ name, email, firm, role, fundSize, message, source });

    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://malamalabs.com";
    const accessLink = `${base}/investors/access?token=${rec.id}`;

    // Notify founders (uses existing mail util in the monorepo; swap to your sender).
    // Kept fire-and-forget so the response is fast.
    notifyFounders(rec, accessLink).catch(() => { });
    // Send the investor their access link.
    sendAccessLink(rec, accessLink).catch(() => { });

    return NextResponse.json({
      ok: true,
      // We return the link so the success screen can show "check your email"
      // and (optionally) deep-link immediately. Do not expose other investors.
      accessLink,
      message: "Access granted. Check your email for your secure link.",
    });
  } catch (e) {
    console.error("investor request error", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// ── Notification stubs ────────────────────────────────────────────────────────
// Replace these with your existing email sender (Resend / Postmark / SES).
async function notifyFounders(rec: any, link: string) {
  const to = process.env.INVESTOR_NOTIFY_TO || "founders@malamalabs.com";
  const payload = {
    to,
    subject: `New investor access request — ${rec.firm}`,
    text:
      `New access request from the investor portal.\n\n` +
      `Name:  ${rec.name}\n` +
      `Email: ${rec.email}\n` +
      `Firm:  ${rec.firm}\n` +
      `Role:  ${rec.role || "—"}\n` +
      `Fund size: ${rec.fundSize || "—"}\n` +
      `Message: ${rec.message || "—"}\n\n` +
      `Auto-granted Tier 1. They unlock Tier 2 (model + data room) on NDA acceptance.\n` +
      `Admin link: ${link}\n`,
  };
  await postEmail(payload);
}

async function sendAccessLink(rec: any, link: string) {
  const payload = {
    to: rec.email,
    subject: "Your Mālama Labs investor access",
    text:
      `Hi ${rec.name.split(" ")[0]},\n\n` +
      `Thanks for your interest in Mālama Labs. Your secure access link is below.\n\n` +
      `${link}\n\n` +
      `This opens the pitch, one-pager, and interactive financials. The full model and ` +
      `data room unlock after a brief click-to-accept NDA inside the portal.\n\n` +
      `This link is unique to you. Please do not forward it.\n\n` +
      `— Mālama Labs`,
  };
  await postEmail(payload);
}

// Sends via Resend. Falls through to console only if no key is set.
async function postEmail(payload: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Mālama Labs <investors@malamalabs.com>";

  if (!key) {
    console.log("[mail:dev]", payload.subject, "->", payload.to);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[mail:resend] send failed", res.status, err);
  }
}