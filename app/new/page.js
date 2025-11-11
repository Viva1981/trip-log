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
    companions: "" // vesszővel elválasztott e-mail címek
  });

  function onChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate() {
    if (!form.title.trim()) return "Az utazás neve kötelező.";
    if (!form.destination.trim()) return "A desztináció kötelező.";
    if (!form.dateFrom || !form.dateTo) return "A dátum mezők kötelezőek.";
    if (form.dateFrom > form.dateTo) return "A 'Mettől' nem lehet későbbi mint a 'Meddig'.";
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) return alert(err);

    // Későbbi lépés: beküldés Apps Script API-ra.
    // Most csak jelzünk és ürítünk.
    alert("Az űrlap rendben. (Következő: bekötjük a backend API-t.)");
    setForm({
      title: "",
      destination: "",
      dateFrom: "",
      dateTo: "",
      visibility: "public",
      companions: ""
    });
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Új utazás</h1>
      <Card title="Utazás adatai" subtitle="Később: Google Places Autocomplete + meghívások">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Utazás neve" name="title" required value={form.title} onChange={onChange} placeholder="Pl. Nyár a Balatonon" />
          <Input label="Desztináció" name="destination" required value={form.destination} onChange={onChange} placeholder="Pl. Siófok (később: Google Places)" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Mettől" type="date" name="dateFrom" required value={form.dateFrom} onChange={onChange} />
            <Input label="Meddig" type="date" name="dateTo" required value={form.dateTo} onChange={onChange} />
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
            <Button type="submit">Létrehozás</Button>
            <Button type="button" variant="secondary" onClick={() => history.back()}>Mégse</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
