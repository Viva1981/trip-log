import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user || null;

  async function getMyTrips() {
    const params = new URLSearchParams({
      path: "trips",
      scope: "mine",
      viewerEmail: user?.email || "",
    });
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_API_BASE}?${params.toString()}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    return json.trips || [];
  }

  const myTrips = user ? await getMyTrips() : [];

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Profil</h1>

      {!user && (
        <p className="text-gray-600">
          Nem vagy bejelentkezve. A fejléc jobb oldalán kattints a{" "}
          <b>Bejelentkezés</b> gombra.
        </p>
      )}

      {user && (
        <div className="space-y-4">
          <div className="border rounded p-3">
            <div className="text-sm text-gray-500">Név</div>
            <div>{user.name}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-sm text-gray-500">Email</div>
            <div>{user.email}</div>
          </div>

          <div>
            <h2 className="font-semibold mt-6 mb-2">Saját utazásaim</h2>
            {myTrips.length === 0 ? (
              <p className="text-gray-500 text-sm">Még nincs utazásod.</p>
            ) : (
              <ul className="space-y-2">
                {myTrips.map((t) => (
                  <li key={t.id} className="border rounded p-2">
                    <b>{t.title}</b> · {t.destination} ({t.visibility})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
