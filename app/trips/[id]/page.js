"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

function fmt(d){ if(!d) return "—"; if(typeof d==="string" && d.length>=10) return d.slice(0,10); try{ return new Date(d).toISOString().slice(0,10); }catch{ return String(d);} }
function fmtSize(n){ if(n==null) return "—"; if(n<1024) return `${n} B`; if(n<1024*1024) return `${(n/1024).toFixed(1)} KB`; return `${(n/1024/1024).toFixed(2)} MB`; }

export default function TripPage(){
  const { data: session, status } = useSession();
  const params = useParams();

  const [trip,setTrip]=useState(null);
  const [error,setError]=useState(null);
  const [files,setFiles]=useState({ photos:[], docs:[], limits:{ maxPhoto:3, maxDoc:5, maxBytes:10*1024*1024 } });
  const [busy,setBusy]=useState(false);

  const triedWithoutEmail = useRef(false);

  // Csak akkor kérünk adatot, ha a session státusz nem "loading"
  useEffect(()=>{
    if(!params?.id) return;
    if(status === "loading") return;
    loadTrip().then(()=>{
      loadFiles().catch(()=>{});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[params?.id, status]);

  async function loadTrip(){
    try{
      setError(null);
      const qs=new URLSearchParams({ id: params.id });
      if(status === "authenticated" && session?.user?.email){
        qs.append("viewerEmail", session.user.email);
      }
      const res=await fetch(`/api/gs/trip?${qs.toString()}`, { cache:"no-store" });
      const data=await res.json();
      if(!res.ok || data?.error){
        // Ha Unauthorized és még nem próbáltuk bejelentkezett emaillel, várunk a sessionre
        if((data?.error||"").includes("Unauthorized") && status !== "authenticated" && !triedWithoutEmail.current){
          triedWithoutEmail.current = true;
          return; // hamarosan újrahívja az effect, amikor a status már "authenticated"
        }
        throw new Error(data?.error || "Hiba történt");
      }
      const obj=data.trip ?? data; if(!obj?.id) throw new Error("Utazás nem található");
      setTrip(obj);
    }catch(e){ setError(e.message); }
  }

  async function loadFiles(){
    try{
      const qs=new URLSearchParams({ id: params.id });
      if(status === "authenticated" && session?.user?.email){
        qs.append("viewerEmail", session.user.email);
      }
      const res=await fetch(`/api/gs/list-files?`+qs.toString(), { cache:"no-store" });
      const data=await res.json();
      if(!res.ok || data?.error) throw new Error(data?.error || "Hiba történt");
      setFiles(data);
    }catch(e){ console.error(e); }
  }

  async function toBase64(file){
    const r=new FileReader();
    return new Promise((resolve,reject)=>{
      r.onload=()=>{ const s=String(r.result||""); resolve((s.split(",")[1])||""); };
      r.onerror=reject; r.readAsDataURL(file);
    });
  }

  async function onUpload(kind, ev){
    const file=ev.target.files?.[0]; ev.target.value="";
    if(!file) return;
    const maxBytes=files?.limits?.maxBytes || 10*1024*1024;
    if(file.size>maxBytes) return alert("A fájl túl nagy (max 10 MB).");
    if(kind==="photo" && files.photos.length>=(files?.limits?.maxPhoto??3)) return alert("Elérted a fotó limitet.");
    if(kind==="doc" && files.docs.length>=(files?.limits?.maxDoc??5)) return alert("Elérted a dokumentum limitet.");

    try{
      setBusy(true);
      const b64=await toBase64(file);
      const payload={
        id: params.id, kind, name: file.name, mimeType: file.type || "application/octet-stream",
        contentBase64: b64, viewerEmail: session?.user?.email || "", viewerName: session?.user?.name || ""
      };
      const res=await fetch(`/api/gs/add-file`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
      const data=await res.json();
      if(!res.ok || data?.error) throw new Error(data?.error || "Feltöltési hiba");
      await loadFiles();
    }catch(e){ alert("Hiba: "+e.message); } finally{ setBusy(false); }
  }

  async function onDelete(fileId){
    if(!confirm("Biztos törlöd?")) return;
    try{
      setBusy(true);
      const res=await fetch(`/api/gs/delete-file`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ id: params.id, fileId, viewerEmail: session?.user?.email || "" })
      });
      const data=await res.json();
      if(!res.ok || data?.error) throw new Error(data?.error || "Törlési hiba");
      await loadFiles();
    }catch(e){ alert("Hiba: "+e.message); } finally{ setBusy(false); }
  }

  async function onToggle(file){
    const next = file.visibility === "public" ? "private" : "public";
    try{
      setBusy(true);
      const res=await fetch(`/api/gs/toggle-file`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ id: params.id, fileId: file.id, visibility: next, viewerEmail: session?.user?.email || "" })
      });
      const data=await res.json();
      if(!res.ok || data?.error) throw new Error(data?.error || "Módosítási hiba");
      await loadFiles();
    }catch(e){ alert("Hiba: "+e.message); } finally{ setBusy(false); }
  }

  if(error) return <main className="p-4 text-red-600"><b>Hiba:</b> {error}</main>;
  if(!trip)  return <main className="p-4"><p>Töltés...</p></main>;

  const Row = ({item}) => (
    <li className="flex items-center justify-between">
      <span className="truncate">{item.name}</span>
      <span className="flex items-center gap-3 text-gray-500 text-sm">
        {item.kind === "photo" ? null : <span>{item.mimeType}</span>}
        <span>{fmtSize(item.size)}</span>
        <span className="text-xs px-2 py-0.5 border rounded">{item.visibility}</span>
        {item.canManage && (
          <>
            <button className="px-2 py-0.5 border rounded" onClick={()=>onToggle(item)} disabled={busy}>
              {item.visibility === "public" ? "Priváttá" : "Publikussá"}
            </button>
            <button className="px-2 py-0.5 border rounded" onClick={()=>onDelete(item.id)} disabled={busy}>🗑️</button>
          </>
        )}
      </span>
    </li>
  );

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">{trip.title}</h1>

      <div className="grid gap-2">
        <div className="border rounded p-2"><div className="text-sm text-gray-500">Desztináció</div><div>{trip.destination}</div></div>
        <div className="border rounded p-2"><div className="text-sm text-gray-500">Láthatóság</div><div>{trip.visibility}</div></div>
        <div className="border rounded p-2"><div className="text-sm text-gray-500">Mettől</div><div>{fmt(trip.dateFrom)}</div></div>
        <div className="border rounded p-2"><div className="text-sm text-gray-500">Meddig</div><div>{fmt(trip.dateTo)}</div></div>
        <div className="border rounded p-2"><div className="text-sm text-gray-500">Útitársak</div><div>{trip.companions || "—"}</div></div>
        <div className="border rounded p-2"><div className="text-sm text-gray-500">Létrehozó</div><div>{trip.ownerName || trip.ownerEmail || "—"}</div></div>
      </div>

      {/* Fotók */}
      <section className="border rounded p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Fotók</h2>
          <input type="file" accept="image/*" onChange={(e)=>onUpload("photo", e)} disabled={busy} />
        </div>
        <div className="text-sm text-gray-500">Limit: {files?.limits?.maxPhoto ?? 3} db · jelenleg: {files.photos.length}</div>
        {files.photos.length === 0 ? (
          <div className="text-gray-500 text-sm">Még nincs fotó.</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {files.photos.map(p => <Row key={p.id} item={p} />)}
          </ul>
        )}
      </section>

      {/* Dokumentumok */}
      <section className="border rounded p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Dokumentumok</h2>
          <input type="file" onChange={(e)=>onUpload("doc", e)} disabled={busy} />
        </div>
        <div className="text-sm text-gray-500">Limit: {files?.limits?.maxDoc ?? 5} db · jelenleg: {files.docs.length}</div>
        {files.docs.length === 0 ? (
          <div className="text-gray-500 text-sm">Még nincs dokumentum.</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {files.docs.map(d => <Row key={d.id} item={d} />)}
          </ul>
        )}
      </section>

      <div className="text-xs text-gray-400">ID: {trip.id}</div>
      <div className="text-xs text-gray-400">Szabályok: törölni/módosítani csak a feltöltő tud. Privát fájlokat kizárólag a trip tulajdonosa látja.</div>
    </main>
  );
}
