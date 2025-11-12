import { NextResponse } from "next/server";

const PUBLIC_BASE = process.env.NEXT_PUBLIC_APP_API_BASE || "";
const SERVER_BASE = process.env.APP_API_BASE_SERVER || "";

function withPath(base, path) {
  if (!base) return "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}path=${encodeURIComponent(path)}`;
}

function appendQuery(url, searchParams) {
  const u = new URL(url);
  for (const [k, v] of searchParams.entries()) {
    if (k === "path") continue; // mi adjuk
    u.searchParams.set(k, v);
  }
  return u.toString();
}

async function fetchAsJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; }
  catch { payload = { nonJson: text?.slice(0, 400) ?? "" }; }
  return { ok: res.ok, status: res.status || 502, payload };
}

function looksGoodJson(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.ok === true) return true;
  if (payload.trip) return true;
  if (Array.isArray(payload.items)) return true;
  if (payload.message === "new-trip saved") return true;
  if ("received" in payload) return true;
  return false;
}

async function smartForward(method, path, searchParams, bodyText) {
  const baseInit = {
    method,
    headers: method === "POST" ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
    body: method === "POST" ? bodyText : undefined,
    redirect: "follow",
    cache: "no-store"
  };

  if (PUBLIC_BASE) {
    let urlPublic = withPath(PUBLIC_BASE, path);
    if (method === "GET") urlPublic = appendQuery(urlPublic, searchParams);
    const r1 = await fetchAsJson(urlPublic, baseInit);
    if (r1.ok && looksGoodJson(r1.payload)) {
      return NextResponse.json(r1.payload, { status: 200 });
    }
    if (!SERVER_BASE) {
      return NextResponse.json(r1.payload, { status: r1.ok ? 200 : r1.status });
    }
  }

  if (SERVER_BASE) {
    let urlServer = withPath(SERVER_BASE, path);
    if (method === "GET") urlServer = appendQuery(urlServer, searchParams);
    const r2 = await fetchAsJson(urlServer, baseInit);
    return NextResponse.json(r2.payload, { status: r2.ok ? 200 : r2.status });
  }

  return NextResponse.json({ error: "API base missing" }, { status: 500 });
}

export async function GET(req, { params }) {
  try {
    return await smartForward("GET", params.path, req.nextUrl.searchParams);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const bodyText = await req.text();
    return await smartForward("POST", params.path, new URLSearchParams(), bodyText);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
