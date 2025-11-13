"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function NewTripPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const ownerEmail = session?.user?.email ?? "";
  const ownerName = session?.user?.name ?? "";

  const [form, setForm] = useState({
    title: "",
    destination: "",
    dateFrom: "",
    dateTo: "",
    visibility: "public",
    companions: "",
  });

  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Alap validáció
    if (!form.title.trim()) {
      alert("Az utazás neve kötelező.");
      return;
    }
    if (!form.destination.trim()) {
      alert("A desztináció kötelező.");
      return;
    }
    if (form.dateFrom && form.dateTo && form.dateFrom > form.dateTo) {
      alert("A 'Mettől' nem lehet későbbi, mint a 'Meddig'.");
      return;
    }

    try {
      setSubmitting(true);

      const body = {
        ...form,
        ownerEmail,
        ownerName,
      };

      const res = await fetch("/api/gs/new-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Hiba történt a mentés közben.");
      }

      // Siker: átirányítás az új utazásra
      const tripId = data.tripId;
      if (tripId) {
        router.push(`/trips/${tripId}`);
      } else {
        // ha valamiért nincs tripId, legalább menjünk vissza a főoldalra
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Ismeretlen hiba történt.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Vissza link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <span className="text-lg leading-none">←</span>
            <span>Vissza az utazáslistához</span>
          </Link>
        </div>

        {/* Kártya */}
        <section className="rounded-xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
          <header className="mb-6 border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Új utazás
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Add meg az alapadatokat, később a fotókat, dokumentumokat és
              költségeket a trip nézetből tudod kezelni.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Utazás neve */}
            <div>
              <label
                htmlFor="title"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Utazás neve <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="Pl. Nyári kiruccanás a Balatonra"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-tight text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Desztináció */}
            <div>
              <label
                htmlFor="destination"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Desztináció <span className="text-red-500">*</span>
              </label>
              <input
                id="destination"
                name="destination"
                type="text"
                value={form.destination}
                onChange={handleChange}
                placeholder="Pl. Siófok, Párizs, Miskolc Hungary…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-tight text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Később ide tudunk Google Places keresőt is kötni.
              </p>
            </div>

            {/* Dátumok */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="dateFrom"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
                >
                  Mettől
                </label>
                <input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  value={form.dateFrom}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-tight text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label
                  htmlFor="dateTo"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
                >
                  Meddig
                </label>
                <input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  value={form.dateTo}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-tight text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Láthatóság */}
            <div>
              <label
                htmlFor="visibility"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Láthatóság
              </label>
              <select
                id="visibility"
                name="visibility"
                value={form.visibility}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-tight text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="public">Publikus</option>
                <option value="private">Privát</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Publikus: bárki láthatja ezt az utazást. Privát: csak te és
                később a meghívott útitársak.
              </p>
            </div>

            {/* Útitársak */}
            <div>
              <label
                htmlFor="companions"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Útitársak (e-mail címek, vesszővel elválasztva)
              </label>
              <textarea
                id="companions"
                name="companions"
                value={form.companions}
                onChange={handleChange}
                rows={2}
                placeholder="pelda1@email.com, pelda2@email.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-tight text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Tulaj info (csak kijelzés) */}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <p>
                <span className="font-medium text-slate-700">Bejelentkezve:</span>{" "}
                {ownerName || ownerEmail || "Vendégként".toLowerCase()}
              </p>
              {!ownerEmail && (
                <p className="mt-1 text-red-500">
                  Új utazás létrehozásához javasolt bejelentkezni, hogy a
                  tulajdonos mező helyesen töltődjön.
                </p>
              )}
            </div>

            {/* Gombok */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={classNames(
                  "inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  submitting && "opacity-75"
                )}
              >
                {submitting ? "Mentés…" : "Utazás létrehozása"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
