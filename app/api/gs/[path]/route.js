import { NextResponse } from "next/server";

const SERVER_BASE =
  process.env.APP_API_BASE_SERVER || process.env.NEXT_PUBLIC_APP_API_BASE || "";

function withPath(base, path) {
  if (!base) return "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}path=${encodeURIComponent(path)}`;
}

async function fetchJsonWithFallback(url, init) {
  const res = await fetch(url, init);
  let payload;
  try {
    payload = await res.json();
  } catch {
    const txt = await res.text();
    payload = { nonJson: txt.slice(0, 400) }; // rövidített betekintés
  }
  return { res, payload };
}

async function forward(method, path, bodyText) {
  const target = withPath(SERVER_BASE, path);
  if (!target) return NextResponse.json({ error: "API base missing" }, { status: 500 });

  const init = {
    method,
    headers: method === "POST" ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
    body: method === "POST" ? bodyText : undefined,
    redirect: "follow",
    cache: "no-store"
  };

  // első próbálkozás
  let { res, payload } = await fetchJsonWithFallback(target, init);

  // ha 429 (rate limit), egyszer újrapróbáljuk ~150ms múlva
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 150));
    ({ res, payload } = await fetchJsonWithFallback(target, init));
  }

  const status = res.ok ? 200 : res.status || 502;
  return NextResponse.json(payload, { status });
}

export async function GET(_req, { params }) {
  try {
    return await forward("GET", params.path);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const bodyText = await req.text();
    return await forward("POST", params.path, bodyText);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
