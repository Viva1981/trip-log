import { NextResponse } from "next/server";

// Szerver: elsődlegesen az /exec URL-t használjuk (APP_API_BASE_SERVER).
// Ha nincs megadva, fallback a NEXT_PUBLIC_APP_API_BASE-re.
const SERVER_BASE = process.env.APP_API_BASE_SERVER || process.env.NEXT_PUBLIC_APP_API_BASE || "";

function withPath(base, path) {
  if (!base) return "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}path=${encodeURIComponent(path)}`;
}

export async function GET(_req, { params }) {
  try {
    const target = withPath(SERVER_BASE, params.path);
    if (!target) return NextResponse.json({ error: "API base missing" }, { status: 500 });
    const res = await fetch(target, { method: "GET", redirect: "follow", cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.ok ? 200 : res.status || 502 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const target = withPath(SERVER_BASE, params.path);
    if (!target) return NextResponse.json({ error: "API base missing" }, { status: 500 });

    const body = await req.text(); // JSON szöveg (változtatás nélkül továbbítjuk)
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
      redirect: "follow",
      cache: "no-store"
    });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.ok ? 200 : res.status || 502 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
