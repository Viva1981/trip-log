import "./globals.css";
import Providers from "./providers";
import AuthButtons from "./components/AuthButtons";

export const metadata = { title: "Trip Log", description: "Utazás napló" };

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <body>
        <Providers>
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            <header className="flex items-center justify-between">
              <a href="/" className="font-semibold">Trip Log</a>
              <nav className="flex items-center gap-3">
                <a href="/profile" className="underline">Profil</a>
                <AuthButtons />
              </nav>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
