"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const MAX_PHOTOS = 3;
const MAX_DOCS = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function fmt(d) {
  if (!d) return "—";
  if (typeof d === "string" && d.length >= 10) return d.slice(0, 10);
  try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d); }
}
function fmtSize(n) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(1)} MB`;
}
async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function TripPage() {
  const { data: session } = useSession();
  const params = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);

  const [photos, setPhotos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (params?.id) {
      loadTrip();
      loadFiles("photo");
      loadFiles("doc");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, session]);

  async function loadTrip() {
    try {
      const search = new URLSearchParams({ id: params.id });
      if (session?.user?.email) search.append("viewerEmail", session.user.email);
      const res = await fetch(`/api/gs/trip?${search.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Hiba történt");
      const obj = data.trip ?? data;
      if (!obj || !obj.id) throw new Error("Utazás nem található");
      setTrip(obj);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadFiles(kind) {
    try {
      const search = new URLSearchParams({ path: "files", tripId: params.id, kind });
      const res = await fetch(`/api/gs/files?${search.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data?.files) {
        if (kind === "photo") setPhotos(data.files);
        else setDocs(data.files);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpload(kind, file) {
    if (!file) return;
    if (file.size > MAX_SIZE) return alert("A fájl túl nagy (max 10 MB).");
    if (kind === "photo" && photos.length >= MAX_PHOTOS) return alert("Elérted a 3 fotó limitet.");
    if (kind === "doc" && docs.length >= MAX_DOCS) return alert("Elérted az 5 dokumentum limitet.");

    setBusy(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await fetch(`/api/gs/upload-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: trip.id,
          kind,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          visibility: trip.visibility || "public",
          description: ""
          , data: b64
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Feltöltési hiba");
      if (kind === "photo") await loadFiles("photo"); else await loadFiles("doc");
    } catch (e) {
      alert("Hiba: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(fileId) {
    if (!confirm("Biztos törlöd?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/gs/delete-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id, fileId })
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Törlési hiba");
      await loadFiles("photo");
      await loadFiles("doc");
    } catch (e) {
      alert("Hiba: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <main className="p-4 text-red-600"><b>Hiba:</b> {error}</main>;
  if (!trip) return <main className="p-4"><p>Töltés...</p></main>;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{trip.title}</h1>
        <div className="text-sm text-gray-600">{trip.destination} · {trip.visibility}</div>
        <div className="text-sm text-gray-500">{fmt(trip.dateFrom)} → {fmt(trip.dateTo)}</div>
      </div>

      {/* Photos */}
      <section className="border rounded p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Fotók ({photos.length}/{MAX_PHOTOS})</h2>
          <input
            type="file"
            accept="image/*"
            disabled={busy || photos.length >= MAX_PHOTOS}
            onChange={(e) => e.target.files?.[0] && handleUpload("photo", e.target.files[0])}
          />
        </div>
        {photos.length === 0 ? (
          <div className="text-sm text-gray-500">Nincs fotó feltöltve.</div>
        ) : (
          <ul className="space-y-1">
            {photos.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-gray-500">{f.mimeType} · {fmtSize(f.size)}</div>
                </div>
                <button
                  onClick={() => handleDelete(f.fileId)}
                  disabled={busy}
                  className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Törlés
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Docs */}
      <section className="border rounded p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Dokumentumok ({docs.length}/{MAX_DOCS})</h2>
          <input
            type="file"
            disabled={busy || docs.length >= MAX_DOCS}
            onChange={(e) => e.target.files?.[0] && handleUpload("doc", e.target.files[0])}
          />
        </div>
        {docs.length === 0 ? (
          <div className="text-sm text-gray-500">Nincs dokumentum feltöltve.</div>
        ) : (
          <ul className="space-y-1">
            {docs.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-gray-500">{f.mimeType} · {fmtSize(f.size)}</div>
                </div>
                <button
                  onClick={() => handleDelete(f.fileId)}
                  disabled={busy}
                  className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Törlés
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="text-xs text-gray-400">ID: {trip.id} • Limit: fotó 3, doksi 5, max 10 MB/fájl</div>
    </main>
  );
}
