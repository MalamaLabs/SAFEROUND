// app/investors/page.tsx
// Public investor landing. Shows the thesis + a request-access form.
// No auth. On submit, the API auto-grants Tier 1 and emails a secure link.

"use client";

import { useState } from "react";

const FUND_SIZES = ["Angel / Individual", "< $50M", "$50M – $250M", "$250M – $1B", "> $1B", "Strategic / Corporate"];

export default function InvestorsPage() {
  const [form, setForm] = useState({ name: "", email: "", firm: "", role: "", fundSize: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError("");
    if (!form.name || !form.email || !form.firm) {
      setError("Name, email, and firm are required.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/investors/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: typeof window !== "undefined" ? window.location.search : "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <main className="inv-root">
      <style>{CSS}</style>

      <div className="inv-wrap">
        <div className="brand">◆ Mālama Labs · Investors</div>

        <h1>The measurement layer for the <em>physical world.</em></h1>
        <p className="lede">
          Hardware-verified environmental data infrastructure. A decentralized network of sensor nodes
          that sign every reading in silicon and anchor it on-chain. <strong>Carbon proved the pipeline.
          Nine verticals scale it.</strong>
        </p>

        <div className="stats">
          <div className="s"><div className="n">2,786+</div><div className="l">SaveCards on-chain since Jun 2024</div></div>
          <div className="s"><div className="n">$266M</div><div className="l">Base-case Year 5 revenue</div></div>
          <div className="s"><div className="n">$1B+</div><div className="l">Valuation at conservative multiple</div></div>
        </div>

        <div className="grid">
          <div className="left">
            <div className="eyebrow">What you&apos;ll get</div>
            <ul className="tiers">
              <li>
                <span className="tag open">Open</span>
                <div>
                  <strong>Pitch deck, one-pager, interactive financials</strong>
                  <p>Available immediately after you request access.</p>
                </div>
              </li>
              <li>
                <span className="tag nda">NDA</span>
                <div>
                  <strong>Full model and data room</strong>
                  <p>Unlocked after a brief click-to-accept NDA inside the portal.</p>
                </div>
              </li>
            </ul>
            <p className="note">
              Mālama Labs, Inc. is a Delaware C-Corp raising a Series Seed. Materials are confidential and
              provided for evaluation only. Nothing here is an offer of securities.
            </p>
          </div>

          <div className="right">
            {status === "done" ? (
              <div className="success">
                <div className="check">✓</div>
                <h2>Access granted.</h2>
                <p>We&apos;ve sent a secure link to <strong>{form.email}</strong>. Open it to view the pitch,
                one-pager, and interactive financials. The full model and data room unlock after a quick NDA.</p>
                <p className="small">Didn&apos;t get it? Check spam, or email founders@malamalabs.com.</p>
              </div>
            ) : (
              <div className="formcard">
                <div className="eyebrow">Request access</div>
                <Field label="Full name *" v={form.name} onChange={(v) => update("name", v)} placeholder="Jane Investor" />
                <Field label="Work email *" v={form.email} onChange={(v) => update("email", v)} placeholder="jane@fund.com" type="email" />
                <Field label="Firm *" v={form.firm} onChange={(v) => update("firm", v)} placeholder="Acme Capital" />
                <Field label="Role" v={form.role} onChange={(v) => update("role", v)} placeholder="Partner" />
                <div className="field">
                  <label>Fund size</label>
                  <select value={form.fundSize} onChange={(e) => update("fundSize", e.target.value)}>
                    <option value="">Select…</option>
                    {FUND_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Anything we should know? (optional)</label>
                  <textarea value={form.message} onChange={(e) => update("message", e.target.value)} rows={3}
                    placeholder="Thesis fit, intro source, timeline…" />
                </div>
                {error && <div className="err">{error}</div>}
                <button onClick={submit} disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Request access"}
                </button>
                <p className="fineprint">
                  By requesting access you agree we may contact you about this raise. We don&apos;t share your
                  information. You can opt out anytime.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, v, onChange, placeholder, type = "text" }:
  { label: string; v: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={v} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const CSS = `
:root{
  --canvas:#0a0e0a;--panel:#161c13;--panel2:#11160f;--line:#232b1d;--lime:#c4f061;
  --limeDim:#9bbf4d;--ink:#eef2e8;--inkDim:#9aa495;--faint:#5f6b58;--warn:#f0a861;
}
.inv-root{background:var(--canvas);color:var(--ink);min-height:100vh;
  font-family:'Inter Tight',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.inv-wrap{max-width:1080px;margin:0 auto;padding:64px 32px 96px;}
.brand{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.26em;
  text-transform:uppercase;color:var(--lime);margin-bottom:40px;}
.inv-root h1{font-family:'Newsreader',Georgia,serif;font-weight:500;
  font-size:clamp(2.2rem,5vw,3.6rem);line-height:1.05;letter-spacing:-.02em;margin-bottom:22px;}
.inv-root h1 em{font-style:italic;color:var(--lime);}
.lede{font-size:clamp(1rem,1.5vw,1.2rem);color:var(--inkDim);max-width:62ch;line-height:1.55;}
.lede strong{color:var(--ink);font-weight:600;}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);
  border:1px solid var(--line);margin:40px 0 56px;}
.stats .s{background:var(--canvas);padding:22px 24px;}
.stats .n{font-family:'Newsreader',serif;font-size:2rem;font-weight:500;color:var(--lime);line-height:1;}
.stats .l{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--inkDim);margin-top:10px;}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--limeDim);margin-bottom:18px;display:flex;align-items:center;gap:10px;}
.eyebrow::before{content:'';width:18px;height:1px;background:var(--limeDim);}
.tiers{list-style:none;display:flex;flex-direction:column;gap:14px;margin-bottom:24px;}
.tiers li{display:flex;gap:14px;align-items:flex-start;background:var(--panel);
  border:1px solid var(--line);padding:16px 18px;border-radius:5px;}
.tag{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;
  padding:4px 9px;border-radius:3px;flex-shrink:0;margin-top:2px;}
.tag.open{background:rgba(196,240,97,.14);color:var(--lime);}
.tag.nda{background:rgba(240,168,97,.14);color:var(--warn);}
.tiers strong{color:var(--ink);font-size:.95rem;}
.tiers p{color:var(--inkDim);font-size:.85rem;margin-top:3px;}
.note{font-size:.82rem;color:var(--faint);line-height:1.5;}
.formcard{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:28px;}
.field{margin-bottom:14px;}
.field label{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;
  text-transform:uppercase;color:var(--inkDim);margin-bottom:7px;}
.field input,.field select,.field textarea{width:100%;background:var(--panel2);
  border:1px solid var(--line);border-radius:5px;color:var(--ink);font-size:14px;
  font-family:'Inter Tight',sans-serif;padding:11px 13px;outline:none;transition:border-color .2s;}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--lime);}
.field textarea{resize:vertical;}
.err{color:var(--warn);font-family:'JetBrains Mono',monospace;font-size:11px;margin:6px 0 12px;}
button{width:100%;background:var(--lime);color:var(--canvas);border:none;border-radius:5px;
  font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;padding:14px;cursor:pointer;transition:opacity .2s;margin-top:6px;}
button:hover:not(:disabled){opacity:.88;}
button:disabled{opacity:.5;cursor:default;}
.fineprint{font-size:.72rem;color:var(--faint);line-height:1.5;margin-top:14px;}
.success{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:40px 32px;text-align:center;}
.success .check{width:52px;height:52px;border-radius:50%;background:rgba(196,240,97,.14);
  color:var(--lime);font-size:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
.success h2{font-family:'Newsreader',serif;font-weight:500;font-size:1.8rem;margin-bottom:14px;}
.success p{color:var(--inkDim);font-size:.95rem;line-height:1.55;margin-bottom:10px;}
.success p strong{color:var(--ink);}
.success .small{font-size:.82rem;color:var(--faint);}
@media(max-width:820px){.grid{grid-template-columns:1fr;gap:32px;}.stats{grid-template-columns:1fr;}}
`;
