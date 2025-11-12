async function getTrip(id) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/gs/trip?id=${encodeURIComponent(id)}`, { cache: "no-store" });
  // Fallback: relatív hívás, ha SITE_URL nincs beállítva (Vercelen úgyis van)
  if (!res.ok) return null;
  const data = await res.json();
  return data.trip || null;
}

export default async function TripPage({ params }) {
  const trip = await getTrip(params.id);
  if (!trip) {
    return <main className="space-y-2"><h1 className="text-2xl font-bold">Utazás nem található</h1></main>;
  }
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{trip.title}</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="border rounded p-3"><div className="text-sm text-gray-500">Desztináció</div><div>{trip.destination}</div></div>
        <div className="border rounded p-3"><div className="text-sm text-gray-500">Láthatóság</div><div>{trip.visibility}</div></div>
        <div className="border rounded p-3"><div className="text-sm text-gray-500">Mettől</div><div>{trip.dateFrom}</div></div>
        <div className="border rounded p-3"><div className="text-sm text-gray-500">Meddig</div><div>{trip.dateTo}</div></div>
        <div className="border rounded p-3 sm:col-span-2"><div className="text-sm text-gray-500">Útitársak</div><div>{trip.companions || "—"}</div></div>
      </div>
      <div className="text-xs text-gray-500">ID: {trip.id}</div>
    </main>
  );
}
