'use client';

import { useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Card from "../components/Card";

export default function NewTripPage() {
  const [form, setForm] = useState({
    title: "",
    destination: "",
    dateFrom: "",
    dateTo: "",
    visibility: "public",
    companions: ""
  });
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate() {
    if (!form.title.trim()) return "Az utazás neve kötelező.";
    if (!form.destination.trim()) return "A desztináció kötelező.";
    if (form.dateFrom && form.dateTo && form.dateFrom > form.dateTo)
      return "A 'Mettől' nem lehet későbbi mint a 'Meddig'.";
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) return alert(err);

    setLoading(true);
    try {
      const res = await fetch("/api/gs/new-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Hiba történt");
      alert("Sikeres beküldés (skeleton). Válasz: " + JSON.stringify(data));
      setForm({
        title: "",
        destination: "",
        dateFrom: "",
        dateTo: "",
        visibility: "public",
        companions: ""
      });
    } catch (e) {
      alert("Hiba: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Új utazás</h1>
      <Card title="Utazás adatai" subtitle="Később: Google Places + Meghívások + Sheets/Drive mentés">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Utazás neve" name="title" required value={form.title} onChange={onChange} placeholder="Pl. Nyár a Balatonon" />
          <Input label="Desztináció" name="destination" required value={form.destination} onChange={onChange} placeholder="Pl. Siófok" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Mettől" type="date" name="dateFrom" value={form.dateFrom} onChange={onChange} />
            <Input label="Meddig" type="date" name="dateTo" value={form.dateTo} onChange={onChange} />
          </div>
          <Select
            label="Láthatóság"
            name="visibility"
            value={form.visibility}
            onChange={onChange}
            options={[
              { value: "public", label: "Publikus" },
              { value: "private", label: "Privát" }
            ]}
          />
          <label className="block text-sm space-y-1">
            <span className="text-gray-700">Útitársak (e-mail, vesszővel elválasztva)</span>
            <textarea
              name="companions"
              value={form.companions}
              onChange={onChange}
              rows={3}
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="pelda1@email.com, pelda2@email.com"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "Küldés..." : "Létrehozás"}</Button>
            <Button type="button" variant="secondary" onClick={() => history.back()} disabled={loading}>Mégse</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
