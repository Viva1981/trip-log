export default function Home() {
  return (
    <main className="space-y-2">
      <h1 className="text-2xl font-bold">Üdv! Stabil minimál alap kész.</h1>
      <p className="text-gray-700">Mostantól erre építjük vissza fokozatosan: Auth, PWA, UI.</p>
      <div className="mt-4 p-3 border rounded">
        <div className="font-semibold mb-1">Mi következik?</div>
        <ul className="list-disc pl-5 text-sm">
          <li>Alap komponensek (gombok, űrlapok)</li>
          <li>Főoldal kereső és utazás-kártyák</li>
          <li>/new és /trips/[id] váz</li>
        </ul>
      </div>
    </main>
  );
}
