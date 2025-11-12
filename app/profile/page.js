import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user || null;

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Profil</h1>

      {!user && (
        <p className="text-gray-600">
          Nem vagy bejelentkezve. A fejléc jobb oldalán kattints a <b>Bejelentkezés</b> gombra.
        </p>
      )}

      {user && (
        <div className="grid gap-3">
          <div className="border rounded p-3"><div className="text-sm text-gray-500">Név</div><div>{user.name || "—"}</div></div>
          <div className="border rounded p-3"><div className="text-sm text-gray-500">Email</div><div>{user.email || "—"}</div></div>
        </div>
      )}
    </main>
  );
}
