"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

function fmt(d){ if(!d) return "—"; if(typeof d==="string"&&d.length>=10) return d.slice(0,10); try{ return new Date(d).toISOString().slice(0,10);}catch{ return String(d);} }

export default function Home(){
  const { data: session } = useSession();
  const [q,setQ]=useState("");
  const [scope,setScope]=useState("public"); // public | mine | all
  const [trips,setTrips]=useState([]);

  async function load(){
    const params=new URLSearchParams({ path:"trips", q, scope });
    if(scope!=="public" && session?.user?.email) params.append("viewerEmail", session.user.email);
    const res=await fetch("/api/gs/trips?"+params.toString(), { cache:"no-store" });
    const data=await res.json();
    setTrips(data?.trips||[]);
  }

  useEffect(()=>{ load(); }, [scope]); // első betöltés + scope váltás
  // kis kereső késleltetés
  useEffect(()=>{ const t=setTimeout(load, 300); return ()=>clearTimeout(t); }, [q]);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Üdv! Stabil alap kész.</h1>
      <p className="text-gray-600">Auth, PWA, űrlap → Sheets, listanézet és részletek.</p>

      <div className="flex items-center gap-2">
        <input
          className="border rounded px-3 py-2 w-[320px]"
          placeholder="Keresés (név / desztináció)"
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
        <select className="border rounded px-2 py-2"
          value={scope} onChange={e=>setScope(e.target.value)}>
          <option value="public">Publikus utak</option>
          <option value="mine">Csak az én útjaim</option>
          <option value="all">Összes</option>
        </select>

        {/* ÚJ UTAZÁS gomb a jobb oldalon */}
        <Link href="/new" className="ml-4 inline-block px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
          Új utazás
        </Link>
      </div>

      <div className="space-y-3">
        {trips.map(t=>(
          <a key={t.id} href={`/trips/${t.id}`} className="block border rounded p-3 hover:bg-gray-50">
            <div className="text-blue-700 font-semibold">{t.title}</div>
            <div className="text-sm text-gray-600">
              {t.destination || "—"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {fmt(t.dateFrom)} → {fmt(t.dateTo)} · {t.visibility} · Létrehozó: {t.ownerName || t.ownerEmail || "—"}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
