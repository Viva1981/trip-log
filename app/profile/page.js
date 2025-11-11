import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main>
        <h1 style={{fontSize:"1.25rem",fontWeight:700}}>Nem vagy bejelentkezve</h1>
        <p style={{marginTop:"0.5rem"}}>
          <a href="/api/auth/signin" style={{textDecoration:"underline"}}>Bejelentkezés Google-lel</a>
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1 style={{fontSize:"1.25rem",fontWeight:700}}>Profil</h1>
      <ul style={{marginTop:"0.5rem", lineHeight:1.7}}>
        <li><b>Név:</b> {session.user?.name ?? "–"}</li>
        <li><b>Email:</b> {session.user?.email ?? "–"}</li>
      </ul>
      <p style={{marginTop:"0.75rem"}}>
        <a href="/api/auth/signout" style={{textDecoration:"underline"}}>Kijelentkezés</a>
      </p>
    </main>
  );
}
