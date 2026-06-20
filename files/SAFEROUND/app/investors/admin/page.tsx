// app/investors/admin/page.tsx
// Founder-only dashboard. Lists all investor requests, NDA status, access counts.
// Protected by a simple admin key in the query string checked server-side via the API.
// For production, swap to your real auth (session cookie / NextAuth).

"use client";

import { useEffect, useState } from "react";

interface Row {
  id: string; name: string; email: string; firm: string; role?: string;
  fundSize?: string; tier: string; ndaAccepted: boolean; ndaAcceptedAt?: string;
  ndaIp?: string; createdAt: string; lastAccessAt?: string; accessCount: number;
}

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("key") || "";
    if (k) { setKey(k); load(k); }
    else setLoading(false);
  }, []);

  async function load(k: string) {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`/api/investors/admin?key=${encodeURIComponent(k)}`);
      if (res.status === 403) { setErr("Invalid admin key."); setLoading(false); return; }
      const data = await res.json();
      setRows(data.investors || []); setAuthed(true);
    } catch { setErr("Failed to load."); }
    finally { setLoading(false); }
  }

  const ndaCount = rows.filter((r) => r.ndaAccepted).length;

  if (!authed) {
    return (
      <main className="ad-root">
        <div className="ad-gate">
          <div className="brand">◆ Mālama · Admin</div>
          <h1>Investor Dashboard</h1>
          <input type="password" placeholder="ADMIN KEY" value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(key)} />
          {err && <div className="err">{err}</div>}
          <button onClick={() => load(key)} disabled={loading}>{loading ? "…" : "Enter"}</button>
        </div>
        <style>{CSS}</style>
      </main>
    );
  }

  return (
    <main className="ad-root">
      <div className="ad-wrap">
        <div className="brand">◆ Mālama · Admin</div>
        <div className="ad-head">
          <h1>Investor Pipeline</h1>
          <div className="kpis">
            <div className="kpi"><div className="kn">{rows.length}</div><div className="kl">Requests</div></div>
            <div className="kpi"><div className="kn">{ndaCount}</div><div className="kl">NDAs signed</div></div>
            <div className="kpi"><div className="kn">{rows.reduce((a, r) => a + (r.accessCount || 0), 0)}</div><div className="kl">Total views</div></div>
          </div>
        </div>

        <table className="ad-table">
          <thead>
            <tr><th>Firm / Name</th><th>Email</th><th>Fund</th><th>Tier</th><th>NDA</th><th>Views</th><th>Requested</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.firm}</strong><br /><span className="dim">{r.name}{r.role ? ` · ${r.role}` : ""}</span></td>
                <td className="mono small">{r.email}</td>
                <td className="small">{r.fundSize || "—"}</td>
                <td><span className={`pill ${r.tier}`}>{r.tier === "tier2" ? "Data Room" : "Tier 1"}</span></td>
                <td>{r.ndaAccepted
                  ? <span className="nda-ok" title={`${r.ndaAcceptedAt} · ${r.ndaIp}`}>✓ {fmtDate(r.ndaAcceptedAt)}</span>
                  : <span className="dim">—</span>}</td>
                <td className="mono">{r.accessCount || 0}</td>
                <td className="small dim">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No requests yet.</p>}
      </div>
      <style>{CSS}</style>
    </main>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

const CSS = `
:root{--canvas:#0a0e0a;--panel:#161c13;--panel2:#11160f;--line:#232b1d;--lime:#c4f061;
  --inkDim:#9aa495;--ink:#eef2e8;--faint:#5f6b58;--warn:#f0a861;}
.ad-root{background:var(--canvas);color:var(--ink);min-height:100vh;
  font-family:'Inter Tight',system-ui,sans-serif;}
.ad-wrap{max-width:1100px;margin:0 auto;padding:48px 32px 80px;}
.brand{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.26em;
  text-transform:uppercase;color:var(--lime);margin-bottom:32px;}
.ad-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;
  padding-bottom:20px;border-bottom:1px solid var(--line);}
.ad-root h1{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:2.2rem;}
.kpis{display:flex;gap:28px;}
.kpi{text-align:right;}
.kn{font-family:'Newsreader',serif;font-size:1.8rem;color:var(--lime);line-height:1;}
.kl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--inkDim);margin-top:5px;}
.ad-table{width:100%;border-collapse:collapse;}
.ad-table th{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--inkDim);text-align:left;padding:12px 14px;
  border-bottom:1px solid var(--line);}
.ad-table td{padding:14px;border-bottom:1px solid var(--line);font-size:.9rem;vertical-align:top;}
.dim{color:var(--faint);}
.small{font-size:.82rem;}
.mono{font-family:'JetBrains Mono',monospace;}
.pill{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.06em;text-transform:uppercase;
  padding:4px 9px;border-radius:3px;}
.pill.tier1{background:rgba(154,164,149,.14);color:var(--inkDim);}
.pill.tier2{background:rgba(196,240,97,.14);color:var(--lime);}
.nda-ok{color:var(--lime);font-family:'JetBrains Mono',monospace;font-size:.78rem;cursor:help;}
.empty{color:var(--faint);text-align:center;padding:60px 0;font-family:'JetBrains Mono',monospace;}
.ad-gate{max-width:360px;margin:0 auto;padding:140px 24px;text-align:center;}
.ad-gate h1{margin-bottom:28px;font-size:1.8rem;}
.ad-gate input{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:5px;
  color:var(--ink);font-family:'JetBrains Mono',monospace;padding:13px;text-align:center;
  margin-bottom:12px;outline:none;}
.ad-gate input:focus{border-color:var(--lime);}
.ad-gate button{width:100%;background:var(--lime);color:var(--canvas);border:none;border-radius:5px;
  font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;padding:13px;cursor:pointer;}
.err{color:var(--warn);font-family:'JetBrains Mono',monospace;font-size:11px;margin-bottom:12px;}
@media(max-width:760px){.ad-head{flex-direction:column;align-items:flex-start;gap:20px;}
  .ad-table{font-size:.8rem;}.ad-table th:nth-child(3),.ad-table td:nth-child(3){display:none;}}
`;
