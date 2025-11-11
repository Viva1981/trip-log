import { NextResponse } from "next/server";

// Két bázis: PUBLIC = googleusercontent (end-user), SERVER = exec
const PUBLIC_BASE = process.env.NEXT_PUBLIC_APP_API_BASE || "";
const SERVER_BASE = process.env.APP_API_BASE_SERVER || "";

// Helyes összefűzés: ha már van "?" a base-ben, "&path=", különben "?path="
function withPath(base, path) {
  if (!base) return "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}path=${encodeURIComponent(path)}`;
}

// Egyetlen olvasás: text() -> JSON parse próbálkozás
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

// Okos forward: először PUBLIC, ha nem oké, akkor SERVER
async function smartForward(method, path, bodyText) {
  const init = {
    method,
    headers: method === "POST" ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
    body: method === "POST" ? bodyText : undefined,
    redirect: "follow",
    cache: "no-store"
  };

  // 1) Próbáljuk a PUBLIC bázist (googleusercontent end-user URL)
  if (PUBLIC_BASE) {
    const urlPublic = withPath(PUBLIC_BASE, path);
    const r1 = await fetchAsJson(urlPublic, init);
    // Ha 2xx, vagy 405/401/429 KIVÉTELTŐL ELTÉRŐ hiba jött, adjuk vissza
    // (405 = method not allowed, 401/429 = gyakori GAS válasz, ilyenkor próbáljuk a SERVER-t)
    if (r1.ok || !(r1.status === 405 || r1.status === 401 || r1.status === 429)) {
      return NextResponse.json(r1.payload, { status: r1.ok ? 200 : r1.status });
    }
  }

  // 2) Fallback a SERVER bázisra (/exec Web App URL)
  if (SERVER_BASE) {
    const urlServer = withPath(SERVER_BASE, path);
    const r2 = await fetchAsJson(urlServer, init);
    return NextResponse.json(r2.payload, { status: r2.ok ? 200 : r2.status });
  }

  // Ha egyik bázis sincs beállítva:
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
