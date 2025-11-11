import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_APP_API_BASE || ""; // GAS end-user URL (googleusercontent.com... vagy exec)

function withPath(base, path) {
  if (!base) return "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}path=${encodeURIComponent(path)}`;
}

export async function GET(_req, { params }) {
  try {
    const target = withPath(API_BASE, params.path);
    if (!target) return NextResponse.json({ error: "API base missing" }, { status: 500 });
    const res = await fetch(target, { method: "GET" });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.ok ? 200 : res.status || 502 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const target = withPath(API_BASE, params.path);
    if (!target) return NextResponse.json({ error: "API base missing" }, { status: 500 });

    const body = await req.text(); // továbbítjuk változtatás nélkül
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body
    });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.ok ? 200 : res.status || 502 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
