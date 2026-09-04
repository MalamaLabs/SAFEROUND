import { GoogleAuth } from "google-auth-library";

// Read-only Drive reader. Resolves the current deck / one-pager / financials
// from the shared folder by filename version, with in-memory caching and a
// pinned-ID fallback. Never writes to Drive.

const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const MATERIALS_TTL_MS = 5 * 60 * 1000;
const BUFFER_TTL_MS = 30 * 60 * 1000;

export type Family = "deck" | "onePager" | "financials";

export interface Material {
  id: string;
  name: string;
  version: string;
  size: number;
  modifiedTime: string;
  fallback: boolean;
}

export interface Materials {
  deck: Material | null;
  onePager: Material | null;
  financials: Material | null;
}

const FAMILY_RE: Record<Family, RegExp> = {
  deck: /^Malama_Seed_Deck_v(\d+)_(\d+)\.pdf$/,
  onePager: /^Malama_Labs_One_Pager_v(\d+)\.pdf$/,
  financials: /^Malama_Labs_Investor_Financials_v(\d+)\.pdf$/,
};

export const FAMILIES: Family[] = ["deck", "onePager", "financials"];

// Sort key for a filename within its family; null if it does not match.
function versionOf(family: Family, name: string): { key: number; label: string } | null {
  const m = name.match(FAMILY_RE[family]);
  if (!m) return null;
  if (family === "deck") {
    const major = Number(m[1]);
    const minor = Number(m[2]);
    return { key: major * 1000 + minor, label: `v${major}.${minor}` };
  }
  const n = Number(m[1]);
  return { key: n, label: `v${n}` };
}

// Parse a version label from a Drive filename (used by the log/CSV).
export function versionFromName(name: string): string {
  for (const fam of FAMILIES) {
    const v = versionOf(fam, name);
    if (v) return v.label;
  }
  return "";
}

function warn(family: Family) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "warn", msg: "drive_fallback", family }));
}

let auth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (auth) return auth;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const credentials = JSON.parse(raw);
  auth = new GoogleAuth({ credentials, scopes: [SCOPE] });
  return auth;
}

async function accessToken(): Promise<string> {
  const client = await getAuth().getClient();
  const t = await client.getAccessToken();
  if (!t.token) throw new Error("Failed to obtain Drive access token");
  return t.token;
}

async function driveGet(path: string, token: string): Promise<Response> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Drive ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
}

// Direct children of the folder only (parents contains folderId), which
// excludes anything moved into the Archive subfolder.
async function listFolderPdfs(token: string): Promise<DriveFile[]> {
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("DRIVE_FOLDER_ID is not set");
  const q = encodeURIComponent(
    `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
  );
  const fields = encodeURIComponent("files(id,name,size,modifiedTime)");
  const res = await driveGet(`files?q=${q}&fields=${fields}&pageSize=1000`, token);
  const data = (await res.json()) as { files?: DriveFile[] };
  return data.files || [];
}

async function fileMeta(id: string, token: string): Promise<DriveFile> {
  const fields = encodeURIComponent("id,name,size,modifiedTime");
  const res = await driveGet(`files/${id}?fields=${fields}`, token);
  return (await res.json()) as DriveFile;
}

function toMaterial(family: Family, f: DriveFile, fallback: boolean): Material {
  const v = versionOf(family, f.name);
  return {
    id: f.id,
    name: f.name,
    version: v?.label || versionFromName(f.name) || "",
    size: f.size ? Number(f.size) : 0,
    modifiedTime: f.modifiedTime || "",
    fallback,
  };
}

function fallbackIds(): Partial<Record<Family, string>> {
  try {
    return JSON.parse(process.env.DRIVE_FALLBACK_IDS || "{}");
  } catch {
    return {};
  }
}

async function resolveFallback(family: Family, token: string | null): Promise<Material | null> {
  const id = fallbackIds()[family];
  if (!id) return null;
  warn(family);
  if (token) {
    try {
      const meta = await fileMeta(id, token);
      return toMaterial(family, meta, true);
    } catch {
      // fall through to id-only material
    }
  }
  return { id, name: "", version: "", size: 0, modifiedTime: "", fallback: true };
}

let materialsCache: { value: Materials; at: number } | null = null;

export async function listCurrentMaterials(force = false): Promise<Materials> {
  const now = Date.now();
  if (!force && materialsCache && now - materialsCache.at < MATERIALS_TTL_MS) {
    return materialsCache.value;
  }

  let token: string | null = null;
  let files: DriveFile[] = [];
  let listOk = true;
  try {
    token = await accessToken();
    files = await listFolderPdfs(token);
  } catch {
    listOk = false;
  }

  const result: Materials = { deck: null, onePager: null, financials: null };

  if (listOk) {
    for (const fam of FAMILIES) {
      let best: { file: DriveFile; key: number } | null = null;
      for (const f of files) {
        const v = versionOf(fam, f.name);
        if (v && (!best || v.key > best.key)) best = { file: f, key: v.key };
      }
      if (best) result[fam] = toMaterial(fam, best.file, false);
    }
  }

  // Fill any family that did not resolve (list failed or no match) from fallback.
  for (const fam of FAMILIES) {
    if (!result[fam]) result[fam] = await resolveFallback(fam, token);
  }

  materialsCache = { value: result, at: now };
  return result;
}

const bufferCache = new Map<string, { buf: Buffer; at: number }>();

export async function downloadFile(id: string): Promise<Buffer> {
  const now = Date.now();
  const cached = bufferCache.get(id);
  if (cached && now - cached.at < BUFFER_TTL_MS) return cached.buf;

  const token = await accessToken();
  const res = await driveGet(`files/${id}?alt=media`, token);
  const buf = Buffer.from(await res.arrayBuffer());
  bufferCache.set(id, { buf, at: now });
  return buf;
}
