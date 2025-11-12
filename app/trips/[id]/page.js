"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function TripPage() {
  const { data: session } = useSession();
  const params = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (params?.id) loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, session]);

  async function loadTrip() {
    try {
      const search = new URLSearchParams({ id: params.id });
      if (session?.user?.email) search.append("viewerEmail", session.user.email);

      // 🔧 PROXY HELYES ÚTVONAL
      const res = await fetch(`/api/gs/trip?${search.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Hiba történt");

      // GAS néha {trip:{...}}, néha sima {...} – kezeljük mindkettőt:
      const obj = data.trip ?? data;
      if (!obj || !obj.id) throw new Error("Utazás nem található");
      setTrip(obj);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <main className="p-4 text-red-600">
        <b>Hiba:</b> {error}
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="p-4">
        <p>Töltés...</p>
      </main>
    );
  }

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
      </div>
      <div className="text-xs text-gray-400">ID: {trip.id}</div>
    </main>
  );
}
