"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

/* ===== Helper függvények ===== */

function formatDate(iso) {
  if (!iso) return "-";
  return String(iso).slice(0, 10);
}

function formatVisibility(vis) {
  if (!vis) return "";
  if (vis === "public") return "Publikus";
  if (vis === "private") return "Privát";
  return vis;
}

function bytesToKb(bytes) {
  if (!bytes) return "0 kB";
  const kb = Math.round(Number(bytes) / 1024);
  return `${kb} kB`;
}

function niceMime(mime) {
  if (!mime) return "Fájl";
  const m = mime.toLowerCase();
  if (m.includes("pdf")) return "PDF";
  if (m.includes("image/")) return "Kép";
  if (m.includes("word") || m.includes("officedocument.word")) return "DOCX";
  if (m.includes("excel") || m.includes("spreadsheet")) return "XLSX";
  if (m.includes("text")) return "Szöveg";
  return "Fájl";
}

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Nem sikerült beolvasni a fájlt."));
    r.onload = () => {
      const result = String(r.result || "");
      const idx = result.indexOf("base64,");
      if (idx >= 0) {
        resolve(result.substring(idx + "base64,".length));
      } else {
        resolve(result);
      }
    };
    r.readAsDataURL(file);
  });
}

/* ===== Kebab menü ===== */

function KebabMenu({ items, alignRight = true }) {
  const [open, setOpen] = useState(false);
  if (!items || !items.length) return null;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-white hover:text-slate-900"
      >
        <span className="text-lg leading-none">⋯</span>
      </button>
      {open && (
        <div
          className={classNames(
            "absolute z-20 mt-1 w-44 origin-top rounded-md bg-white py-1 text-xs text-slate-700 shadow-lg ring-1 ring-black/5",
            alignRight ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick && item.onClick();
              }}
              className={classNames(
                "flex w-full items-center px-3 py-1.5 text-left hover:bg-slate-50",
                item.danger && "text-red-600 hover:bg-red-50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Fotó thumb komponens ===== */

function PhotoThumb({ tripId, file, viewerEmail, onOpen }) {
  const [thumbUrl, setThumbUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadThumb() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("tripId", tripId);
        params.set("fileId", file.id);
        if (viewerEmail) params.set("viewerEmail", viewerEmail);

        const res = await fetch("/api/gs/thumb64?" + params.toString());
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok || !data.base64 || !data.mimeType) return;
        if (cancelled) return;
        setThumbUrl(`data:${data.mimeType};base64,${data.base64}`);
      } catch (err) {
        console.error("Thumb load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadThumb();
    return () => {
      cancelled = true;
    };
  }, [tripId, file.id, viewerEmail]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-xl bg-slate-200 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-blue-400"
    >
      <div className="aspect-[4/3] w-full">
        {thumbUrl && !loading ? (
          <img
            src={thumbUrl}
            alt={file.description || file.name || "Fotó"}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
            Betöltés…
          </div>
        )}
      </div>
      {(file.description || file.name) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2 pb-1.5 pt-6 text-left">
          <p className="truncate text-[11px] font-medium text-white">
            {file.description || file.name}
          </p>
        </div>
      )}
    </button>
  );
}

/* ===== Fő oldal ===== */

export default function TripPage({ params }) {
  const tripId = params.id;
  const { data: session } = useSession();
  const viewerEmail = session?.user?.email ?? "";
  const viewerName = session?.user?.name ?? "";

  const [trip, setTrip] = useState(null);
  const [tripError, setTripError] = useState("");
  const [tripLoading, setTripLoading] = useState(false);

  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const [files, setFiles] = useState({
    photos: [],
    docs: [],
    limits: { maxPhoto: 3, maxDoc: 5, maxBytes: 10 * 1024 * 1024 },
  });
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState("");

  const [uploadBusy, setUploadBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDataUrl, setModalDataUrl] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMime, setModalMime] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const isOwner =
    trip && viewerEmail && viewerEmail.toLowerCase() === String(trip.ownerEmail || "").toLowerCase();

  /* ---- Betöltés ---- */

  async function loadTrip() {
    try {
      setTripLoading(true);
      setTripError("");
      const qs = new URLSearchParams();
      qs.set("id", tripId);
      if (viewerEmail) qs.set("viewerEmail", viewerEmail);

      const res = await fetch("/api/gs/trip?" + qs.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Nem sikerült betölteni az utazást.");
      }
      setTrip(data);
      setNoteDraft(data.note || "");
    } catch (err) {
      console.error(err);
      setTrip(null);
      setTripError(err.message || "Ismeretlen hiba történt.");
    } finally {
      setTripLoading(false);
    }
  }

  async function loadFiles() {
    try {
      setFilesLoading(true);
      setFilesError("");
      const qs = new URLSearchParams();
      qs.set("id", tripId);
      if (viewerEmail) qs.set("viewerEmail", viewerEmail);

      const res = await fetch("/api/gs/list-files?" + qs.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Nem sikerült betölteni a fájlokat.");
      }
      setFiles({
        photos: Array.isArray(data.photos) ? data.photos : [],
        docs: Array.isArray(data.docs) ? data.docs : [],
        limits: data.limits || files.limits,
      });
    } catch (err) {
      console.error(err);
      setFilesError(err.message || "Ismeretlen hiba történt.");
      setFiles((prev) => ({ ...prev, photos: [], docs: [] }));
    } finally {
      setFilesLoading(false);
    }
  }

  useEffect(() => {
    loadTrip();
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, viewerEmail]);

  /* ---- Feltöltés ---- */

  async function handleUpload(kind, file) {
    if (!file) return;
    if (!viewerEmail) {
      alert("Feltöltéshez be kell jelentkezni.");
      return;
    }

    const isPhoto = kind === "photo";
    const limit = isPhoto ? files.limits.maxPhoto : files.limits.maxDoc;
    const currentCount = isPhoto ? files.photos.length : files.docs.length;
    if (currentCount >= limit) {
      alert(`Elérted a limitet (${limit} db) ebben a szekcióban.`);
      return;
    }

    try {
      setUploadBusy(true);
      const base64 = await fileToBase64(file);

      const body = {
        id: tripId,
        kind,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64: base64,
        viewerEmail,
        viewerName,
      };

      const res = await fetch("/api/gs/add-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Nem sikerült feltölteni a fájlt.");
      }
      await loadFiles();
    } catch (err) {
      console.error(err);
      alert(err.message || "Ismeretlen hiba történt feltöltés közben.");
    } finally {
      setUploadBusy(false);
    }
  }

  /* ---- Fájl műveletek ---- */

  async function handleDelete(file) {
    if (!viewerEmail) {
      alert("Törléshez be kell jelentkezni.");
      return;
    }
    if (!file.canManage) {
      alert("Csak a feltöltő törölheti ezt a fájlt.");
      return;
    }
    if (!confirm("Biztosan törlöd ezt a fájlt?")) return;

    try {
      const res = await fetch("/api/gs/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tripId,
          fileId: file.id,
          viewerEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Nem sikerült törölni a fájlt.");
      }
      await loadFiles();
    } catch (err) {
      console.error(err);
      alert(err.message || "Ismeretlen hiba történt.");
    }
  }

  async function handleToggleVisibility(file) {
    if (!viewerEmail) {
      alert("Módosításhoz be kell jelentkezni.");
      return;
    }
    if (!file.canManage) {
      alert("Csak a feltöltő módosíthatja a láthatóságot.");
      return;
    }

    const newVis = file.visibility === "public" ? "private" : "public";

    try {
      const res = await fetch("/api/gs/toggle-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tripId,
          fileId: file.id,
          visibility: newVis,
          viewerEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Nem sikerült módosítani a láthatóságot.");
      }
      await loadFiles();
    } catch (err) {
      console.error(err);
      alert(err.message || "Ismeretlen hiba történt.");
    }
  }

  async function handleEditDescription(file) {
    if (!viewerEmail) {
      alert("Módosításhoz be kell jelentkezni.");
      return;
    }
    if (!file.canManage) {
      alert("Csak a feltöltő módosíthatja a nevet / megjegyzést.");
      return;
    }

    const current = file.description || "";
    const next = prompt(
      "Adj meg egy rövid nevet / megjegyzést (max. 50 karakter):",
      current
    );
    if (next === null) return;
    const trimmed = next.trim().slice(0, 50);

    try {
      const res = await fetch("/api/gs/update-file-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tripId,
          fileId: file.id,
          description: trimmed,
          viewerEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(
          data.error || "Nem sikerült frissíteni a nevet / megjegyzést."
        );
      }
      await loadFiles();
    } catch (err) {
      console.error(err);
      alert(err.message || "Ismeretlen hiba történt.");
    }
  }

  async function openFileModal(file) {
    try {
      setModalOpen(true);
      setModalLoading(true);
      setModalError("");
      setModalDataUrl("");
      setModalMime("");
      setModalTitle(file.description || file.name || "");

      const qs = new URLSearchParams();
      qs.set("tripId", tripId);
      qs.set("fileId", file.id);
      if (viewerEmail) qs.set("viewerEmail", viewerEmail);

      const res = await fetch("/api/gs/file64?" + qs.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error || !data.base64 || !data.mimeType) {
        throw new Error(data.error || "Nem sikerült megnyitni a fájlt.");
      }

      setModalMime(data.mimeType);
      setModalDataUrl(`data:${data.mimeType};base64,${data.base64}`);
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Ismeretlen hiba történt.");
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setModalDataUrl("");
    setModalMime("");
    setModalTitle("");
    setModalError("");
    setModalLoading(false);
  }

  /* ---- Trip note mentés ---- */

  async function handleSaveNote() {
    if (!viewerEmail || !trip) return;
    if (!isOwner) {
      alert("Csak a tulajdonos módosíthatja a megjegyzést.");
      return;
    }

    const trimmed = (noteDraft || "").trim().slice(0, 500);

    try {
      setNoteSaving(true);
      const res = await fetch("/api/gs/update-trip-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tripId,
          note: trimmed,
          viewerEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Nem sikerült menteni a megjegyzést.");
      }
      // Frissítjük a trip objektumot is lokálisan
      setTrip((prev) => (prev ? { ...prev, note: trimmed } : prev));
      setNoteDraft(trimmed);
    } catch (err) {
      console.error(err);
      alert(err.message || "Ismeretlen hiba történt a mentésnél.");
    } finally {
      setNoteSaving(false);
    }
  }

  /* ===== Render ===== */

  const visibilityLabel = formatVisibility(trip?.visibility);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <span className="mr-1 text-lg">←</span> Vissza az utazáslistához
        </Link>
      </div>

      {tripLoading && !trip && (
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          Utazás betöltése…
        </div>
      )}

      {tripError && !trip && (
        <div className="rounded-lg bg-red-50 p-6 text-sm text-red-700 ring-1 ring-red-200">
          Hiba az utazás betöltésekor: {tripError}
        </div>
      )}

      {trip && (
        <>
          {/* Header kártya – ID nélkül */}
          <section className="mb-6 rounded-3xl bg-gradient-to-r from-blue-500 to-indigo-500 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {trip.title || "Utazás"}
                </h1>
                {trip.destination && (
                  <p className="mt-1 text-sm text-blue-100">
                    {trip.destination}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-100">
                  <span>
                    <span className="font-semibold">Mettől:</span>{" "}
                    {formatDate(trip.dateFrom)}
                  </span>
                  <span>→</span>
                  <span>
                    <span className="font-semibold">Meddig:</span>{" "}
                    {formatDate(trip.dateTo)}
                  </span>
                  <span className="hidden sm:inline-block">•</span>
                  <span>
                    <span className="font-semibold">Létrehozó:</span>{" "}
                    {trip.ownerName || trip.ownerEmail || "Ismeretlen"}
                  </span>
                </div>

                {isOwner && (
                  <p className="mt-2 text-xs text-blue-100/80">
                    Te vagy ennek az útnak a tulajdonosa.
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                {visibilityLabel && (
                  <span
                    className={classNames(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                      trip.visibility === "public"
                        ? "bg-emerald-100/90 text-emerald-800"
                        : "bg-amber-100/90 text-amber-800"
                    )}
                  >
                    {visibilityLabel}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Megjegyzés az útról */}
          <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Megjegyzés az útról
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Rövid leírás, fontos infók, max. 500 karakter.
                </p>
              </div>
            </div>

            <div className="mt-3">
              {isOwner ? (
                <>
                  <textarea
                    value={noteDraft}
                    onChange={(e) =>
                      setNoteDraft(e.target.value.slice(0, 500))
                    }
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Rövid megjegyzés az útról (opcionális)…"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{noteDraft.length} / 500 karakter</span>
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      disabled={noteSaving}
                      className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                      {noteSaving ? "Mentés…" : "Megjegyzés mentése"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {trip.note && trip.note.trim()
                    ? trip.note
                    : "Ehhez az úthoz még nincs megjegyzés."}
                </p>
              )}
            </div>
          </section>

          {/* Tartalom kártyák: Fotók + Dokumentumok */}
          <section className="grid gap-4 md:grid-cols-2">
            {/* Fotók */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Fotók
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Limit: {files.limits.maxPhoto} db • jelenleg:{" "}
                    {files.photos.length}
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700">
                  {uploadBusy ? "Feltöltés…" : "Fájl kiválasztása"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload("photo", f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {filesLoading && (
                <p className="text-xs text-slate-500">Fotók betöltése…</p>
              )}
              {filesError && (
                <p className="text-xs text-red-600">
                  Hiba a fotók betöltésekor: {filesError}
                </p>
              )}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {files.photos.map((file) => (
                  <div key={file.id} className="flex flex-col gap-1">
                    <div className="relative">
                      <PhotoThumb
                        tripId={tripId}
                        file={file}
                        viewerEmail={viewerEmail}
                        onOpen={() => openFileModal(file)}
                      />
                      <div className="absolute right-1 top-1 flex items-center gap-1">
                        {file.visibility === "public" ? (
                          <span className="rounded-full bg-emerald-100/90 px-2 py-0.5 text-[10px] font-medium text-emerald-800 shadow-sm">
                            publikus
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] font-medium text-amber-800 shadow-sm">
                            privát
                          </span>
                        )}
                        {file.canManage && (
                          <KebabMenu
                            items={[
                              {
                                label: "Megnyitás nagyban",
                                onClick: () => openFileModal(file),
                              },
                              {
                                label: "Név / megjegyzés szerkesztése",
                                onClick: () => handleEditDescription(file),
                              },
                              {
                                label:
                                  file.visibility === "public"
                                    ? "Privátra állítás"
                                    : "Publikusra állítás",
                                onClick: () => handleToggleVisibility(file),
                              },
                              {
                                label: "Törlés",
                                danger: true,
                                onClick: () => handleDelete(file),
                              },
                            ]}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {files.photos.length === 0 && !filesLoading && (
                  <p className="col-span-full text-xs text-slate-500">
                    Még nincs feltöltött fotó ehhez az úthoz.
                  </p>
                )}
              </div>
            </div>

            {/* Dokumentumok */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Dokumentumok
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Limit: {files.limits.maxDoc} db • jelenleg:{" "}
                    {files.docs.length}
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700">
                  {uploadBusy ? "Feltöltés…" : "Fájl kiválasztása"}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload("doc", f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {filesLoading && (
                <p className="text-xs text-slate-500">
                  Dokumentumok betöltése…
                </p>
              )}
              {filesError && (
                <p className="text-xs text-red-600">
                  Hiba a dokumentumok betöltésekor: {filesError}
                </p>
              )}

              <div className="mt-2 space-y-2">
                {files.docs.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      {niceMime(file.mimeType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openFileModal(file)}
                        className="block w-full text-left text-xs font-medium text-slate-800 hover:text-blue-600"
                      >
                        {file.description || file.name || "Dokumentum"}
                      </button>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {niceMime(file.mimeType)} • {bytesToKb(file.size)}
                        {file.visibility === "public"
                          ? " • publikus"
                          : " • privát"}
                      </p>
                    </div>
                    {file.canManage && (
                      <KebabMenu
                        items={[
                          {
                            label: "Megnyitás",
                            onClick: () => openFileModal(file),
                          },
                          {
                            label: "Név / megjegyzés szerkesztése",
                            onClick: () => handleEditDescription(file),
                          },
                          {
                            label:
                              file.visibility === "public"
                                ? "Privátra állítás"
                                : "Publikusra állítás",
                            onClick: () => handleToggleVisibility(file),
                          },
                          {
                            label: "Törlés",
                            danger: true,
                            onClick: () => handleDelete(file),
                          },
                        ]}
                      />
                    )}
                  </div>
                ))}

                {files.docs.length === 0 && !filesLoading && (
                  <p className="text-xs text-slate-500">
                    Még nincs feltöltött dokumentum ehhez az úthoz.
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Modal a nagy nézethez */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="relative max-h-full w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <h3 className="text-sm font-semibold text-slate-800 truncate">
                {modalTitle || "Fájl megnyitása"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-4">
              {modalLoading && (
                <p className="text-sm text-slate-500">Betöltés…</p>
              )}
              {modalError && (
                <p className="text-sm text-red-600">
                  Hiba a fájl betöltésekor: {modalError}
                </p>
              )}
              {!modalLoading && !modalError && modalDataUrl && (
                <>
                  {modalMime.startsWith("image/") ? (
                    <img
                      src={modalDataUrl}
                      alt={modalTitle || "Kép"}
                      className="mx-auto max-h-[65vh] w-auto rounded-lg"
                    />
                  ) : (
                    <iframe
                      title={modalTitle || "Dokumentum"}
                      src={modalDataUrl}
                      className="h-[65vh] w-full rounded-lg border border-slate-200"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
