"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

function formatDate(iso) {
  if (!iso) return "-";
  // 2025-11-12T23:00:00.000Z -> 2025-11-12
  return String(iso).slice(0, 10);
}

function formatVisibility(vis) {
  if (!vis) return "";
  if (vis === "public") return "publikus";
  if (vis === "private") return "privát";
  return vis;
}

export default function HomePage() {
  const { data: session } = useSession();
  const viewerEmail = session?.user?.email ?? "";

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("public"); // public | mine | all
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");

  async function loadTrips() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("scope", scope); // public / mine / all
      if (viewerEmail) params.set("viewerEmail", viewerEmail);

      const res = await fetch("/api/gs/trips?" + params.toString());
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Nem sikerült betölteni az utakat.");
      }

      setTrips(Array.isArray(data.trips) ? data.trips : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Ismeretlen hiba történt.");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, [search, scope, viewerEmail]); // változáskor újratöltünk

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Fejléc */}
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Trip Log
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Auth, PWA, űrlap &rarr; Google Sheets &amp; Drive. Utazások
            listanézete és részletek.
          </p>
        </header>

        {/* Kereső + szűrők + Új utazás gomb */}
        <section className="mb-6 flex flex-col gap-3 rounded-xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label
                htmlFor="search"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Keresés név / desztináció alapján
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pl. Siófok, Párizs, &quot;Nyári kiruccanás&quot;..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-tight text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="w-full sm:w-56">
              <label
                htmlFor="scope"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Láthatóság
              </label>
              <select
                id="scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-tight text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="public">Publikus utak</option>
                <option value="mine">Csak az én útjaim</option>
                <option value="all">Összes (publikus + saját privát)</option>
              </select>
            </div>
          </div>

          <div className="shrink-0">
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="text-lg leading-none">＋</span>
              <span>Új utazás</span>
            </Link>
          </div>
        </section>

        {/* Hibaüzenet */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Lista / skeleton */}
        <section aria-label="Utazások listája" className="space-y-3">
          {loading && (
            <>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl bg-slate-200/70"
                />
              ))}
            </>
          )}

          {!loading && trips.length === 0 && !error && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
              Nincs a szűrőnek megfelelő utazás. Próbáld módosítani a keresést
              vagy a láthatósági szűrőt.
            </div>
          )}

          {!loading &&
            trips.map((trip) => {
              const id = trip.id || trip.ID || trip.Id; // óvatos fallback
              const dateFrom = formatDate(trip.dateFrom);
              const dateTo = formatDate(trip.dateTo);
              const ownerName =
                trip.ownerName ||
                trip.owner_name ||
                trip.ownerEmail ||
                "Ismeretlen";

              return (
                <Link
                  key={id}
                  href={id ? `/trips/${id}` : "#"}
                  className="block rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">
                          {trip.title || "Névtelen utazás"}
                        </h2>
                        {trip.visibility && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {formatVisibility(trip.visibility)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {trip.destination || "Ismeretlen desztináció"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {dateFrom} &rarr; {dateTo}
                        <span className="mx-2 text-slate-400">&middot;</span>
                        Létrehozó:{" "}
                        <span className="font-medium text-slate-700">
                          {ownerName}
                        </span>
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-start gap-3 text-xs text-slate-500 sm:mt-0 sm:flex-col sm:items-end sm:gap-1">
                      <span>
                        Utitársak:{" "}
                        {trip.companions && String(trip.companions).trim()
                          ? String(trip.companions)
                          : "—"}
                      </span>
                      <span>
                        Létrehozva:{" "}
                        {trip.createdAt
                          ? String(trip.createdAt).slice(0, 10)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
        </section>
      </div>
    </main>
  );
}
