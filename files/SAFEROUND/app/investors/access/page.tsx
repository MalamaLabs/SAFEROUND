// app/investors/access/page.tsx
// The gated landing reached via the emailed link (?token=...).
// Verifies the token, shows Tier 1 materials, and presents the click-NDA.
// On NDA acceptance, reveals Tier 2 entry (data room link).

"use client";

import { useEffect, useState } from "react";
import { NDA } from "@/lib/nda-text";

interface VerifyResp {
  valid: boolean;
  name?: string;
  firm?: string;
  tier?: string;
  ndaAccepted?: boolean;
  canTier1?: boolean;
  canTier2?: boolean;
}

export default function AccessPage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<VerifyResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNDA, setShowNDA] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [ndaError, setNdaError] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") || "";
    setToken(t);
    if (!t) { setLoading(false); return; }
    fetch(`/api/investors/verify?token=${t}`)
      .then((r) => r.json())
      .then((d) => setState(d))
      .catch(() => setState({ valid: false }))
      .finally(() => setLoading(false));
  }, []);

  async function acceptNDA() {
    setNdaError("");
    if (!agreed) { setNdaError("Please check the box to accept."); return; }
    setAccepting(true);
    try {
      const res = await fetch("/api/investors/nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, agree: true }),
      });
      const data = await res.json();
      if (!res.ok) { setNdaError(data.error || "Could not record acceptance."); setAccepting(false); return; }
      setState((s) => s ? { ...s, ndaAccepted: true, canTier2: true, tier: "tier2" } : s);
      setShowNDA(false);
    } catch {
      setNdaError("Network error. Try again.");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return <Shell><div className="center mono">Verifying access…</div></Shell>;

  if (!token || !state?.valid) {
    return (
      <Shell>
        <div className="gate-err">
          <div className="brand">◆ Mālama Labs · Investors</div>
          <h1>This link isn&apos;t valid.</h1>
          <p>Your access link may have expired or been mistyped. Request a fresh one and we&apos;ll send it right over.</p>
          <a className="btn" href="/investors">Request access</a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="brand">◆ Mālama Labs · Investors</div>
      <div className="welcome">
        <div className="eyebrow">Secure access · {state.firm}</div>
        <h1>Welcome, {state.name?.split(" ")[0]}.</h1>
        <p className="lede">Everything below is confidential and unique to your link. Please don&apos;t forward it.</p>
      </div>

      {/* TIER 1 — open */}
      <section className="tier">
        <div className="thead">
          <span className="tag open">Open</span>
          <h2>Pitch & Financials</h2>
        </div>
        <div className="docs">
          <DocCard title="Pitch Deck" sub="The full Series Seed narrative" href="/investors/docs/pitch.pdf" cta="Open deck" />
          <DocCard title="One-Pager" sub="Executive summary, single page" href="/investors/docs/one-pager.pdf" cta="Open PDF" />
          <DocCard title="Interactive Financials" sub="Scenario model, live charts" href="/investors/financials" cta="Explore" featured />
        </div>
      </section>

      {/* TIER 2 — NDA gated */}
      <section className="tier">
        <div className="thead">
          <span className={`tag ${state.canTier2 ? "open" : "nda"}`}>{state.canTier2 ? "Unlocked" : "NDA"}</span>
          <h2>Full Model & Data Room</h2>
        </div>

        {state.canTier2 ? (
          <div className="docs">
            <DocCard title="Financial Model" sub="12-tab workbook, all assumptions" href="/investors/docs/model.xlsx" cta="Download xlsx" />
            <DocCard title="Data Room" sub="Cap table, legal, contracts, technical" href="/investors/room" cta="Enter room" featured />
            <DocCard title="Pro Forma" sub="Detailed P&L and projections" href="/investors/docs/pro-forma.xlsx" cta="Download" />
          </div>
        ) : (
          <div className="ndabox">
            <p>The full model and data room contain confidential financials, the cap table, and legal materials.
            A quick click-to-accept NDA unlocks them. It takes ten seconds and is recorded for both parties.</p>
            <button className="btn" onClick={() => setShowNDA(true)}>Review & accept NDA</button>
          </div>
        )}
      </section>

      <p className="foot-disc">
        Confidential. Provided for evaluation only and not an offer of securities. All projections are
        base-case estimates, not commitments. © Mālama Labs, Inc.
      </p>

      {showNDA && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowNDA(false); }}>
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <div className="eyebrow">{NDA.title} · {NDA.version}</div>
                <p className="modal-sub">{NDA.effectiveLabel}</p>
              </div>
              <button className="x" onClick={() => setShowNDA(false)}>✕</button>
            </div>
            <div className="nda-scroll">
              {NDA.body.map((s, i) => (
                <div key={i} className="nda-sec">
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <label className="agree">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I have read and agree to the Mutual Non-Disclosure Agreement on behalf of {state.firm}.
                I understand clicking constitutes a binding electronic signature.</span>
              </label>
              {ndaError && <div className="err">{ndaError}</div>}
              <button className="btn" onClick={acceptNDA} disabled={accepting}>
                {accepting ? "Recording…" : "Accept & unlock data room"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{CSS}</style>
    </Shell>
  );
}

function DocCard({ title, sub, href, cta, featured }:
  { title: string; sub: string; href: string; cta: string; featured?: boolean }) {
  return (
    <a className={`doc ${featured ? "feat" : ""}`} href={href} target="_blank" rel="noreferrer">
      <div className="dt">{title}</div>
      <div className="ds">{sub}</div>
      <div className="dc">{cta} →</div>
    </a>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="acc-root"><div className="acc-wrap">{children}</div><style>{CSS}</style></main>;
}

const CSS = `
:root{--canvas:#0a0e0a;--panel:#161c13;--panel2:#11160f;--line:#232b1d;--lime:#c4f061;
  --limeDim:#9bbf4d;--ink:#eef2e8;--inkDim:#9aa495;--faint:#5f6b58;--warn:#f0a861;}
.acc-root{background:var(--canvas);color:var(--ink);min-height:100vh;
  font-family:'Inter Tight',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.acc-wrap{max-width:980px;margin:0 auto;padding:56px 32px 96px;}
.brand{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.26em;
  text-transform:uppercase;color:var(--lime);margin-bottom:40px;}
.mono{font-family:'JetBrains Mono',monospace;color:var(--inkDim);}
.center{text-align:center;padding:120px 0;}
.welcome{margin-bottom:48px;}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--limeDim);margin-bottom:14px;}
.acc-root h1{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:clamp(2rem,4vw,3rem);
  line-height:1.05;letter-spacing:-.02em;margin-bottom:14px;}
.acc-root h1 em{font-style:italic;color:var(--lime);}
.lede{color:var(--inkDim);font-size:1.05rem;max-width:60ch;}
.tier{margin-bottom:40px;}
.thead{display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;
  border-bottom:1px solid var(--line);}
.thead h2{font-family:'Newsreader',serif;font-weight:500;font-size:1.5rem;}
.tag{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;
  padding:5px 10px;border-radius:3px;}
.tag.open{background:rgba(196,240,97,.14);color:var(--lime);}
.tag.nda{background:rgba(240,168,97,.14);color:var(--warn);}
.docs{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.doc{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:22px 20px;
  text-decoration:none;transition:border-color .2s,transform .2s;display:block;}
.doc:hover{border-color:var(--lime);transform:translateY(-2px);}
.doc.feat{border-color:var(--limeDim);}
.dt{font-family:'Newsreader',serif;font-size:1.2rem;color:var(--ink);margin-bottom:5px;}
.ds{font-size:.85rem;color:var(--inkDim);margin-bottom:18px;line-height:1.4;}
.dc{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;color:var(--lime);text-transform:uppercase;}
.ndabox{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:28px;}
.ndabox p{color:var(--inkDim);font-size:.95rem;line-height:1.55;max-width:64ch;margin-bottom:20px;}
.btn{display:inline-block;background:var(--lime);color:var(--canvas);border:none;border-radius:5px;
  font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;padding:13px 22px;cursor:pointer;text-decoration:none;transition:opacity .2s;}
.btn:hover:not(:disabled){opacity:.88;}
.btn:disabled{opacity:.5;cursor:default;}
.foot-disc{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.04em;text-transform:uppercase;
  color:var(--faint);line-height:1.7;margin-top:48px;border-top:1px solid var(--line);padding-top:20px;}
.gate-err{text-align:center;padding:80px 0;}
.gate-err h1{margin-bottom:16px;}
.gate-err p{color:var(--inkDim);max-width:50ch;margin:0 auto 28px;}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.78);display:flex;align-items:center;
  justify-content:center;padding:24px;z-index:100;}
.modal-card{background:var(--panel);border:1px solid var(--line);border-radius:10px;
  max-width:640px;width:100%;max-height:86vh;display:flex;flex-direction:column;}
.modal-head{display:flex;justify-content:space-between;align-items:flex-start;
  padding:24px 28px 18px;border-bottom:1px solid var(--line);}
.modal-sub{font-size:.8rem;color:var(--faint);margin-top:4px;}
.x{background:none;border:none;color:var(--inkDim);font-size:18px;cursor:pointer;width:auto;padding:0;}
.nda-scroll{overflow-y:auto;padding:22px 28px;flex:1;}
.nda-sec{margin-bottom:18px;}
.nda-sec h3{font-family:'Inter Tight',sans-serif;font-size:.92rem;font-weight:600;color:var(--ink);margin-bottom:6px;}
.nda-sec p{font-size:.86rem;color:var(--inkDim);line-height:1.55;}
.modal-foot{padding:20px 28px 24px;border-top:1px solid var(--line);}
.agree{display:flex;gap:12px;align-items:flex-start;cursor:pointer;margin-bottom:16px;}
.agree input{margin-top:3px;width:16px;height:16px;accent-color:var(--lime);flex-shrink:0;}
.agree span{font-size:.84rem;color:var(--inkDim);line-height:1.5;}
.err{color:var(--warn);font-family:'JetBrains Mono',monospace;font-size:11px;margin-bottom:12px;}
@media(max-width:760px){.docs{grid-template-columns:1fr;}}
`;
