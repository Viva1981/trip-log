"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function TripPage() {
  const { data: session } = useSession();
  const params = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [initResult, setInitResult] = useState(null);

  useEffect(() => {
    if (params?.id) loadTrip();
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

  async function initFiles() {
    try {
      setBusy(true);
      setInitResult(null);
      const res = await fetch(`/api/gs/init-files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trip.id })
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Init hiba");
      setInitResult(data);
      // Frissítsük a trip adatokat, hogy látszódjanak az ID-k
      await loadTrip();
      alert("Mappák inicializálva.");
    } catch (e) {
      alert("Hiba: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <main className="p-4 text-red-600"><b>Hiba:</b> {error}</main>;
  if (!trip) return <main className="p-4"><p>Töltés...</p></main>;

  const driveUrl = (id) => id ? `https://drive.google.com/drive/folders/${id}` : null;

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{trip.title}</h1>

      <div className="grid gap-2">
        <div className="border rounded p-2">
          <div className="text-sm text-gray-500">Desztináció</div>
          <div>{trip.destination}</div>
        </div>
        <div className="border rounded p-2">
          <div className="text-sm text-gray-500">Láthatóság</div>
          <div>{trip.visibility}</div>
        </div>
        <div className="border rounded p-2">
          <div className="text-sm text-gray-500">Mettől</div>
          <div>{trip.dateFrom}</div>
        </div>
        <div className="border rounded p-2">
          <div className="text-sm text-gray-500">Meddig</div>
          <div>{trip.dateTo}</div>
        </div>
        <div className="border rounded p-2">
          <div className="text-sm text-gray-500">Útitársak</div>
          <div>{trip.companions || "—"}</div>
        </div>
        <div className="border rounded p-2">
          <div className="text-sm text-gray-500">Létrehozó</div>
          <div>{trip.ownerName || trip.ownerEmail || "—"}</div>
        </div>
      </div>

      <div className="border rounded p-3 space-y-2">
        <div className="font-semibold">Fájlmappák</div>
        <div className="text-sm">
          Owner mappa: {trip.ownerFolderId ? <a className="underline" target="_blank" href={driveUrl(trip.ownerFolderId)}>Megnyitás</a> : "— nincs"}
        </div>
        <div className="text-sm">
          Trip mappa: {trip.tripFolderId ? <a className="underline" target="_blank" href={driveUrl(trip.tripFolderId)}>Megnyitás</a> : "— nincs"}
        </div>
        <div className="text-sm">
          Photos: {trip.photosFolderId ? <a className="underline" target="_blank" href={driveUrl(trip.photosFolderId)}>Megnyitás</a> : "— nincs"}
        </div>
        <div className="text-sm">
          Docs: {trip.docsFolderId ? <a className="underline" target="_blank" href={driveUrl(trip.docsFolderId)}>Megnyitás</a> : "— nincs"}
        </div>

        <div className="pt-2">
          <button
            onClick={initFiles}
            disabled={busy}
            className="px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? "Inicializálás..." : "Fájlmappák inicializálása"}
          </button>
        </div>

        {initResult && (
          <div className="text-xs text-gray-500">
            Kész. TripFolder: {initResult.tripFolderId}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">ID: {trip.id}</div>
      <div className="text-xs text-gray-400">Megjegyzés: max 3 Photo, max 5 Doc; méretlimit: 10 MB / fájl.</div>
    </main>
  );
}
