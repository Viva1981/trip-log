import { NextResponse } from "next/server";

// PUBLIC = googleusercontent end-user URL (GET-re jó lehet, szerver felől néha HTML-t ad 200-zal)
// SERVER = /exec Web App URL (stabil szerver-szerver hívás)
const PUBLIC_BASE = process.env.NEXT_PUBLIC_APP_API_BASE || "";
const SERVER_BASE = process.env.APP_API_BASE_SERVER || "";

// path illesztés: ha már van "?", akkor &path=..., különben ?path=...
function withPath(base, path) {
  if (!base) return "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}path=${encodeURIComponent(path)}`;
}

// Body-t egyszer olvassuk, JSON-t próbálunk, különben nonJson mezőt adunk
async function fetchAsJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { nonJson: text?.slice(0, 400) ?? "" };
  }
  return { ok: res.ok, status: res.status || 502, payload };
}

// Értelmes JSON-e? (health-re ok:true, new-trip-re message/received)
function looksGoodJson(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.ok === true) return true;
  if (payload.message === "new-trip skeleton ok") return true;
  if ("received" in payload) return true;
  return false;
}

async function smartForward(method, path, bodyText) {
  const init = {
    method,
    headers: method === "POST" ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
    body: method === "POST" ? bodyText : undefined,
    redirect: "follow",
    cache: "no-store"
  };

  // 1) Kipróbáljuk PUBLIC-ot (ha van)
  if (PUBLIC_BASE) {
    const urlPublic = withPath(PUBLIC_BASE, path);
    const r1 = await fetchAsJson(urlPublic, init);
    // Ha 2xx és ÉRTELMES JSON, visszaadjuk
    if (r1.ok && looksGoodJson(r1.payload)) {
      return NextResponse.json(r1.payload, { status: 200 });
    }
    // Ha 401/405/429 – menjünk SERVER-re; 
    // Ha 200, de NEM JSON (login HTML), szintén menjünk SERVER-re.
    // Csak ha explicit hiba és nincs SERVER beállítva, adjuk vissza az r1-et.
    if (!SERVER_BASE) {
      return NextResponse.json(r1.payload, { status: r1.ok ? 200 : r1.status });
    }
  }

  // 2) Fallback SERVER (/exec) – ez kell menjen
  if (SERVER_BASE) {
    const urlServer = withPath(SERVER_BASE, path);
    const r2 = await fetchAsJson(urlServer, init);
    return NextResponse.json(r2.payload, { status: r2.ok ? 200 : r2.status });
  }

  // Ha egyik base sincs:
  return NextResponse.json({ error: "API base missing" }, { status: 500 });
}

export async function GET(_req, { params }) {
  try {
    return await smartForward("GET", params.path);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const bodyText = await req.text();
    return await smartForward("POST", params.path, bodyText);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
