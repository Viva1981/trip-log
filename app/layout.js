import "./globals.css";
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
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className="max-w-4xl mx-auto p-4">
        <header className="py-4 border-b mb-4 flex justify-between items-center">
          <strong className="text-lg">Trip Log</strong>
          <nav className="text-sm space-x-2">
            <a href="/profile" className="underline">Profil</a>
            <span>·</span>
            {session ? (
              <a href="/api/auth/signout" className="underline">Kijelentkezés</a>
            ) : (
              <a href="/api/auth/signin" className="underline">Bejelentkezés</a>
            )}
          </nav>
        </header>
        <main>{children}</main>

        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW reg hiba', e);});
            });
          }
        `}} />
      </body>
    </html>
  );
}
