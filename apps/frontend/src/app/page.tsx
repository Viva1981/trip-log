export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Üdv az Utazás Napló V2-ben!</h1>
      <p>Ez egy PWA alap. A következő lépés a Google Auth és az Apps Script API-k bekötése.</p>
      <ul className="list-disc pl-6 text-sm">
        <li>Komplex kereső a főoldalon</li>
        <li>Utazás kártyák</li>
        <li>Fotók / Dokumentumok / Költések / Statisztika</li>
      </ul>
    </section>
  );
}
