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

  // előnézet (bármilyen MIME): {src, name, mime}
  const [preview, setPreview] = useState(null);
  // thumbnail cache: { [fileId]: dataUrl }
  const [thumbs, setThumbs] = useState({});
  const triedWithoutEmail = useRef(false);

  useEffect(()=>{
    if(!params?.id) return;
    if(status==="loading") return;
    loadTrip().then(()=>loadFiles());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[params?.id, status]);

  useEffect(()=>{
    // fotókhoz thumbok betöltése
    (async ()=>{
      if(!files?.photos?.length) return;
      for(const p of files.photos){
        if(!thumbs[p.id]) {
          try{
            const t = await fetchThumb64(p);
            setThumbs(prev => ({ ...prev, [p.id]: t.src }));
          }catch(_){ /* ignore */ }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[files.photos]);

  async function loadTrip(){
    try{
      setError(null);
      const qs=new URLSearchParams({ id: params.id });
      if(status==="authenticated" && session?.user?.email) qs.append("viewerEmail", session.user.email);
      const res=await fetch(`/api/gs/trip?${qs.toString()}`, { cache:"no-store" });
      const data=await res.json();
      if(!res.ok || data?.error){
        if((data?.error||"").includes("Unauthorized") && status!=="authenticated" && !triedWithoutEmail.current){
          triedWithoutEmail.current = true; return;
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
      if(status==="authenticated" && session?.user?.email) qs.append("viewerEmail", session.user.email);
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
      setThumbs(prev => { const cp={...prev}; delete cp[fileId]; return cp; });
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

  async function fetchFile64(file){
    const qs=new URLSearchParams({ path:'file64', tripId: params.id, fileId: file.id });
    if(status==="authenticated" && session?.user?.email) qs.append("viewerEmail", session.user.email);
    const res=await fetch(`/api/gs/file64?`+qs.toString(), { cache:"no-store" });
    const data=await res.json();
    if(!res.ok || data?.error) throw new Error(data?.error || "Előnézeti hiba");
    return { src:`data:${data.mimeType};base64,${data.base64}`, name:data.name, mime:data.mimeType };
  }

  async function fetchThumb64(file){
    const qs=new URLSearchParams({ path:'thumb64', tripId: params.id, fileId: file.id });
    if(status==="authenticated" && session?.user?.email) qs.append("viewerEmail", session.user.email);
    const res=await fetch(`/api/gs/thumb64?`+qs.toString(), { cache:"no-store" });
    const data=await res.json();
    if(!res.ok || data?.error) throw new Error(data?.error || "Thumb hiba");
    return { src:`data:${data.mimeType};base64,${data.base64}` };
  }

  async function openPreview(file){
    try{ const p = await fetchFile64(file); setPreview(p); }
    catch(e){ alert("Hiba: "+e.message); }
  }

  if(error) return <main className="p-4 text-red-600"><b>Hiba:</b> {error}</main>;
  if(!trip)  return <main className="p-4"><p>Töltés...</p></main>;

  // Fotó kártya
  const PhotoCard = ({p}) => (
    <div className="rounded border overflow-hidden bg-white shadow-sm">
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center cursor-pointer" onClick={()=>openPreview(p)}>
        {thumbs[p.id] ? (
          <img src={thumbs[p.id]} alt={p.name} className="object-cover w-full h-full" />
        ) : (
          <div className="text-gray-400 text-sm">töltés…</div>
        )}
      </div>
      <div className="p-2 text-sm">
        <div className="truncate" title={p.name}>{p.name}</div>
        <div className="flex justify-between items-center mt-1 text-gray-500">
          <span>{fmtSize(p.size)}</span>
          <span className="text-xs px-2 py-0.5 border rounded">{p.visibility}</span>
        </div>
        {p.canManage && (
          <div className="flex gap-2 mt-2">
            <button className="px-2 py-0.5 border rounded" onClick={()=>onToggle(p)} disabled={busy}>
              {p.visibility === "public" ? "Priváttá" : "Publikussá"}
            </button>
            <button className="px-2 py-0.5 border rounded" onClick={()=>onDelete(p.id)} disabled={busy}>🗑️</button>
          </div>
        )}
      </div>
    </div>
  );

  // Doksi kártya
  function docIcon(mime){
    if((mime||'').startsWith('application/pdf')) return '📄';
    if((mime||'').startsWith('video/')) return '🎞️';
    if((mime||'').startsWith('audio/')) return '🎧';
    if((mime||'').startsWith('text/')) return '📝';
    return '📎';
  }
  const DocCard = ({d}) => (
    <div className="rounded border overflow-hidden bg-white shadow-sm">
      <button className="aspect-[4/3] w-full bg-gray-50 flex items-center justify-center text-5xl cursor-pointer"
              title="Megnyitás" onClick={()=>openPreview(d)}>
        {docIcon(d.mimeType)}
      </button>
      <div className="p-2 text-sm">
        <div className="truncate" title={d.name}>{d.name}</div>
        <div className="flex justify-between items-center mt-1 text-gray-500">
          <span>{fmtSize(d.size)}</span>
          <span className="text-xs px-2 py-0.5 border rounded">{d.visibility}</span>
        </div>
        {d.canManage && (
          <div className="flex gap-2 mt-2">
            <button className="px-2 py-0.5 border rounded" onClick={()=>onToggle(d)} disabled={busy}>
              {d.visibility === "public" ? "Priváttá" : "Publikussá"}
            </button>
            <button className="px-2 py-0.5 border rounded" onClick={()=>onDelete(d.id)} disabled={busy}>🗑️</button>
          </div>
        )}
      </div>
    </div>
  );

  // Előnézet MIME szerint
  function PreviewContent({src, mime, name}){
    if(mime?.startsWith("image/")){
      return <img src={src} alt={name} className="max-h-[90vh] max-w-[90vw] shadow-2xl border" />;
    }
    if(mime === "application/pdf"){
      return <iframe src={src} title={name} className="w-[90vw] h-[90vh] bg-white" />;
    }
    if(mime?.startsWith("video/")){
      return <video src={src} controls className="max-h-[90vh] max-w-[90vw] bg-black" />;
    }
    if(mime?.startsWith("audio/")){
      return <audio src={src} controls className="w-[80vw]" />;
    }
    if(mime?.startsWith("text/")){
      return <iframe src={src} title={name} className="w-[90vw] h-[90vh] bg-white" />;
    }
    return (
      <div className="bg-white p-6 rounded shadow max-w-[80vw]">
        <p className="mb-2">Ezt a fájlt a böngésző nem tudja megjeleníteni.</p>
        <p className="text-sm text-gray-500">Zárd be ezt az ablakot.</p>
      </div>
    );
  }

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

      {/* Fotók – rács */}
      <section className="border rounded p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Fotók</h2>
          <input type="file" accept="image/*" onChange={(e)=>onUpload("photo", e)} disabled={busy} />
        </div>
        <div className="text-sm text-gray-500">Limit: {files?.limits?.maxPhoto ?? 3} db · jelenleg: {files.photos.length}</div>
        {files.photos.length === 0 ? (
          <div className="text-gray-500 text-sm">Még nincs fotó.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {files.photos.map(p => <PhotoCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {/* Dokumentumok – rács (nincs letöltés link) */}
      <section className="border rounded p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Dokumentumok</h2>
        </div>
        {files.docs.length === 0 ? (
          <div className="text-gray-500 text-sm">Még nincs dokumentum.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {files.docs.map(d => <DocCard key={d.id} d={d} />)}
          </div>
        )}
        <div className="mt-2">
          <input type="file" onChange={(e)=>onUpload("doc", e)} disabled={busy} />
        </div>
      </section>

      {/* Lightbox / előnézet */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setPreview(null)}>
          <PreviewContent {...preview} />
        </div>
      )}

      <div className="text-xs text-gray-400">ID: {trip.id}</div>
    </main>
  );
}
