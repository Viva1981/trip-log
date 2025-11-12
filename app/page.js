"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session } = useSession();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("public");

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, scope, session]);

  async function loadTrips() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      params.append("scope", scope);
      if (session?.user?.email) params.append("viewerEmail", session.user.email);

      const res = await fetch(`/api/gs/trips?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setTrips(json.trips || []);
    } catch (err) {
      console.error(err);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Üdv! Stabil alap kész.</h1>
      <p>Auth, PWA, űrlap → Sheets, listanézet és részletek.</p>

      <div className="flex items-center gap-3">
        <input
          placeholder="Keresés (név / desztináció)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border rounded px-2 py-1"
        />
        {session && (
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="public">Publikus utak</option>
            <option value="mine">Csak az én útjaim</option>
            <option value="all">Összes (admin)</option>
          </select>
        )}
      </div>

      {loading && <p>Töltés...</p>}

      <div className="space-y-3">
        {trips.map((t) => (
          <a key={t.id} href={`/trips/${t.id}`} className="block border rounded p-3 hover:bg-gray-50">
            <div className="font-bold">{t.title}</div>
            <div className="text-sm text-gray-600">{t.destination}</div>
            <div className="text-xs text-gray-500">
              {t.dateFrom} → {t.dateTo} · {t.visibility}
              { (t.ownerName || t.ownerEmail) && (
                <> · <span>Létrehozó: {t.ownerName || t.ownerEmail}</span></>
              )}
            </div>
          </a>
        ))}
        {!loading && trips.length === 0 && (
          <p className="text-gray-500">Nincs találat.</p>
        )}
      </div>
    </main>
  );
}
