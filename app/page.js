function baseUrl() {
  const a = process.env.NEXT_PUBLIC_SITE_URL;
  const b = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  return a || b || "http://localhost:3000";
}

async function fetchTrips() {
  const url = `${baseUrl()}/api/gs/trips?limit=20`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export default async function Home() {
  const items = await fetchTrips();

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Üdv! Stabil alap kész.</h1>
      <p className="text-gray-700">Auth, PWA, űrlap → Sheets, listanézet és részletek.</p>

      <div className="flex items-center gap-2">
        <a href="/new" className="underline">Új utazás</a>
        <span className="text-gray-400">·</span>
        <a href="/profile" className="underline">Profil</a>
      </div>

      <div className="grid gap-3">
        {items.length === 0 && <div className="text-gray-500">Még nincs utazás.</div>}
        {items.map(t => (
          <a key={t.id} href={`/trips/${t.id}`} className="border rounded p-3 hover:bg-gray-50">
            <div className="font-semibold">{t.title}</div>
            <div className="text-sm text-gray-600">{t.destination}</div>
            <div className="text-xs text-gray-500">{t.dateFrom} → {t.dateTo} · {t.visibility}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
