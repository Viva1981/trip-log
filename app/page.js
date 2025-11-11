import Card from "./components/Card";
import Button from "./components/Button";

export default function Home() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Üdv! Stabil minimál alap kész.</h1>
      <p className="text-gray-700">Mostantól erre építjük vissza fokozatosan: Auth, PWA, UI.</p>

      <Card title="Gyors kezdés" subtitle="Demó kártya – később utazáskártyák listája lesz itt">
        <p className="text-sm text-gray-600">Kattints az alábbi gombra egy új utazás létrehozásához.</p>
        <div className="pt-3">
          <a href="/new"><Button>Új utazás</Button></a>
        </div>
      </Card>
    </main>
  );
}
