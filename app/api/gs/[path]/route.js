import { NextResponse } from "next/server";

// Szerver oldali cél: először APP_API_BASE_SERVER (ajánlott: googleusercontent end-user URL),
// ha nincs, fallback a NEXT_PUBLIC_APP_API_BASE-re.
const SERVER_BASE =
  process.env.APP_API_BASE_SERVER || process.env.NEXT_PUBLIC_APP_API_BASE || "";

function withPath(base, path) {
  if (!base) return "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}path=${encodeURIComponent(path)}`;
}

async function fetchAsJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text(); // csak egyszer olvasunk
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { nonJson: text?.slice(0, 400) ?? "" };
  }
  const status = res.ok ? 200 : res.status || 502;
  return NextResponse.json(payload, { status });
}

export async function GET(_req, { params }) {
  try {
    const target = withPath(SERVER_BASE, params.path);
    if (!target) return NextResponse.json({ error: "API base missing" }, { status: 500 });
    return await fetchAsJson(target, { method: "GET", redirect: "follow", cache: "no-store" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const target = withPath(SERVER_BASE, params.path);
    if (!target) return NextResponse.json({ error: "API base missing" }, { status: 500 });
    const bodyText = await req.text(); // továbbítjuk változtatás nélkül
    return await fetchAsJson(target, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: bodyText,
      redirect: "follow",
      cache: "no-store"
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
