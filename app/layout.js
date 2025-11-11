import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

export const metadata = {
  title: "Trip Log",
  description: "Minimál Next.js alap a stabil buildhez"
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="hu">
      <body style={{maxWidth:"64rem",margin:"0 auto",padding:"1rem"}}>
        <header style={{padding:"1rem 0",borderBottom:"1px solid #e5e7eb",marginBottom:"1rem",display:"flex",justifyContent:"space-between"}}>
          <strong>Trip Log</strong>
          <nav style={{fontSize:"0.95rem"}}>
            <a href="/profile" style={{textDecoration:"underline"}}>Profil</a>
            <span style={{margin:"0 0.5rem"}}>·</span>
            {session ? (
              <a href="/api/auth/signout" style={{textDecoration:"underline"}}>Kijelentkezés</a>
            ) : (
              <a href="/api/auth/signin" style={{textDecoration:"underline"}}>Bejelentkezés</a>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
