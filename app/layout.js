export const metadata = {
  title: "Trip Log",
  description: "Minimál Next.js alap a stabil buildhez"
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <body style={{maxWidth:"64rem",margin:"0 auto",padding:"1rem"}}>
        <header style={{padding:"1rem 0",borderBottom:"1px solid #e5e7eb",marginBottom:"1rem"}}>
          <strong>Trip Log</strong>
        </header>
        {children}
      </body>
    </html>
  );
}
