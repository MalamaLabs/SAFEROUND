// app/investors/room/page.tsx
// The Tier 2 data room. Server-gated: re-verifies the token and NDA status
// on every load. If NDA not accepted, redirects back to the access page.

"use client";

import { useEffect, useState } from "react";

interface VerifyResp { valid: boolean; canTier2?: boolean; firm?: string; name?: string; }

const SECTIONS = [
  {
    cat: "Core Documents",
    items: [
      { t: "Whitepaper v1.0", s: "31-page institutional doc: six-layer DePIN, nine verticals, tokenomics", f: "/api/investors/doc/whitepaper" },
      { t: "Pro Forma v2.0", s: "Five-year model, aligned to published V1 economics", f: "/api/investors/doc/pro-forma" },
      { t: "Tokenomics v1", s: "500M cap, 60M emission taper, revenue split, burn floor", f: "/api/investors/doc/tokenomics" },
      { t: "Validator Fees v0.1", s: "USDC protocol revenue mechanics, the operator economics engine", f: "/api/investors/doc/validator-fees" },
    ],
  },
  {
    cat: "Economics & Pricing",
    items: [
      { t: "Genesis Pricing v1.0", s: "Reserve price, reward calculation, cohort normalization", f: "/api/investors/doc/genesis" },
      { t: "Data Demand Score v1.0", s: "Five-component scoring framework driving deal attribution", f: "/api/investors/doc/data-demand" },
      { t: "Financial Model", s: "Scenario workbook: bear / base / bull", f: "/api/investors/doc/model" },
    ],
  },
  {
    cat: "Corporate & Legal",
    items: [
      { t: "Cap Table", s: "Current ownership and option pool", f: "/api/investors/doc/cap-table", soon: true },
      { t: "Certificate of Incorporation", s: "Delaware C-Corp", f: "/api/investors/doc/coi", soon: true },
      { t: "SAFE Template", s: "Round instrument", f: "/api/investors/doc/safe", soon: true },
      { t: "Board Consents", s: "Material resolutions", f: "/api/investors/doc/board", soon: true },
    ],
  },
  {
    cat: "Traction & Pipeline",
    items: [
      { t: "Pilot Data", s: "Texas Node #1, on-chain record", f: "/api/investors/doc/pilot", soon: true },
      { t: "Pipeline Summary", s: "In-discussion partners (stage-honest)", f: "/api/investors/doc/pipeline", soon: true },
    ],
  },
];

export default function DataRoom() {
  const [state, setState] = useState<VerifyResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token")
      || sessionStorage.getItem("inv_token") || "";
    setToken(t);
    if (t) sessionStorage.setItem("inv_token", t);
    if (!t) { setLoading(false); return; }
    fetch(`/api/investors/verify?token=${t}`)
      .then((r) => r.json())
      .then((d) => setState(d))
      .catch(() => setState({ valid: false }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Shell><div className="center mono">Verifying…</div></Shell>;

  if (!state?.valid || !state.canTier2) {
    return (
      <Shell>
        <div className="center">
          <div className="brand">◆ Mālama Labs · Data Room</div>
          <h1>NDA required.</h1>
          <p className="mono" style={{ marginBottom: 24 }}>The data room is available after accepting the NDA.</p>
          <a className="btn" href={`/investors/access?token=${token}`}>Go to access page</a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="brand">◆ Mālama Labs · Data Room</div>
      <div className="rhead">
        <div>
          <div className="eyebrow">Confidential · {state.firm}</div>
          <h1>Data Room</h1>
        </div>
        <a className="btn ghost" href={`/investors/access?token=${token}`}>← Back to access</a>
      </div>
      <p className="watermark mono">
        Accessed by {state.name} · {state.firm} · Confidential — do not distribute
      </p>

      {SECTIONS.map((sec) => (
        <section key={sec.cat} className="rsec">
          <div className="rcat">{sec.cat}</div>
          <div className="ritems">
            {sec.items.map((it: any) => (
              it.soon ? (
                <div key={it.t} className="ritem soon">
                  <div className="rit">{it.t}</div>
                  <div className="ris">{it.s}</div>
                  <div className="ria mono">Coming soon</div>
                </div>
              ) : (
                <a key={it.t} className="ritem" href={`${it.f}?token=${token}`} target="_blank" rel="noreferrer">
                  <div className="rit">{it.t}</div>
                  <div className="ris">{it.s}</div>
                  <div className="ria mono">Open →</div>
                </a>
              )
            ))}
          </div>
        </section>
      ))}

      <p className="foot-disc mono">
        All materials confidential under the NDA you accepted. Provided for evaluation only and not an
        offer of securities. Projections are base-case estimates. © Mālama Labs, Inc.
      </p>
      <style>{CSS}</style>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="dr-root"><div className="dr-wrap">{children}</div><style>{CSS}</style></main>;
}

const CSS = `
:root{--canvas:#0a0e0a;--panel:#161c13;--panel2:#11160f;--line:#232b1d;--lime:#c4f061;
  --limeDim:#9bbf4d;--ink:#eef2e8;--inkDim:#9aa495;--faint:#5f6b58;--warn:#f0a861;}
.dr-root{background:var(--canvas);color:var(--ink);min-height:100vh;
  font-family:'Inter Tight',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.dr-wrap{max-width:980px;margin:0 auto;padding:56px 32px 96px;}
.brand{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.26em;
  text-transform:uppercase;color:var(--lime);margin-bottom:40px;}
.mono{font-family:'JetBrains Mono',monospace;}
.center{text-align:center;padding:100px 0;}
.center h1{margin-bottom:14px;}
.rhead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px;}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--limeDim);margin-bottom:12px;}
.dr-root h1{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:clamp(2rem,4vw,2.8rem);
  line-height:1.05;letter-spacing:-.02em;}
.watermark{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);
  margin-bottom:40px;padding-bottom:20px;border-bottom:1px solid var(--line);}
.rsec{margin-bottom:36px;}
.rcat{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--lime);margin-bottom:14px;}
.ritems{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
.ritem{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:18px 20px;
  text-decoration:none;transition:border-color .2s,transform .2s;}
.ritem:hover{border-color:var(--lime);transform:translateY(-2px);}
.ritem.soon{opacity:0.5;cursor:default;}
.ritem.soon:hover{border-color:var(--line);transform:none;}
.ritem.soon .ria{color:var(--ink-faint);}
.rit{font-family:'Newsreader',serif;font-size:1.1rem;color:var(--ink);margin-bottom:4px;}
.ris{font-size:.82rem;color:var(--inkDim);margin-bottom:14px;line-height:1.4;}
.ria{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--lime);}
.btn{display:inline-block;background:var(--lime);color:var(--canvas);border:none;border-radius:5px;
  font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;padding:11px 18px;cursor:pointer;text-decoration:none;transition:opacity .2s;}
.btn:hover{opacity:.88;}
.btn.ghost{background:transparent;color:var(--inkDim);border:1px solid var(--line);}
.btn.ghost:hover{color:var(--ink);border-color:var(--inkDim);opacity:1;}
.foot-disc{font-size:9px;letter-spacing:.04em;text-transform:uppercase;color:var(--faint);
  line-height:1.7;margin-top:44px;border-top:1px solid var(--line);padding-top:20px;}
@media(max-width:760px){.ritems{grid-template-columns:1fr;}.rhead{flex-direction:column;align-items:flex-start;gap:16px;}}
`;
