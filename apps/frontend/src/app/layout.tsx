import "./globals.css";

export const metadata = {
  title: "Utazás Napló V2",
  description: "Közösségi utazás napló PWA"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <header style={{padding:"1rem", borderBottom:"1px solid #e5e7eb", display:"flex", justifyContent:"space-between"}}>
          <div style={{fontWeight:600}}>Utazás Napló V2</div>
          <nav style={{fontSize:"0.9rem"}}>
            <a href="/profile">Profil</a>
            <span style={{margin:"0 0.5rem"}}>·</span>
            <a href="/new">Új utazás</a>
          </nav>
        </header>
        <main style={{maxWidth:"64rem", margin:"0 auto", padding:"1rem"}}>
          {children}
        </main>
      </body>
    </html>
  );
}
