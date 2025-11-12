import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

function baseUrl() {
  const a = process.env.NEXT_PUBLIC_SITE_URL;
  const b = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  return a || b || "http://localhost:3000";
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user || null;

  async function getMyTrips() {
    if (!user?.email) return [];
    const params = new URLSearchParams({
      scope: "mine",
      viewerEmail: user.email,
    });

    // 🔧 CSAK A SAJÁT PROXY-T HÍVJUK (nem közvetlen GAS)
    const res = await fetch(`${baseUrl()}/api/gs/trips?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
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
                    <a href={`/trips/${t.id}`} className="font-semibold underline">
                      {t.title}
                    </a>{" "}
                    · {t.destination} ({t.visibility})
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
