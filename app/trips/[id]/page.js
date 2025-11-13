"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

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

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

// ----- Kép → base64 -----
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

// ----- Thumb komponens -----
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
            alt={file.name || "Fotó"}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
            Betöltés…
          </div>
        )}
      </div>

      {/* Alsó név + overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2 pb-1.5 pt-6 text-left">
        <p className="truncate text-[11px] font-medium text-white">
          {file.name || "Fotó"}
        </p>
      </div>
    </button>
  );
}

export default function TripPage({ params }) {
  const tripId = params.id;
  const { data: session } = useSession();
  const viewerEmail = session?.user?.email ?? "";
  const viewerName = session?.user?.name ?? "";

  const [trip, setTrip] = useState(null);
  const [tripError, setTripError] = useState("");
  const [tripLoading, setTripLoading] = useState(false);

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

  async function loadTrip() {
    try {
      setTripLoading(true);
      setTripError("");
      const params = new URLSearchParams();
      params.set("id", tripId);
      if (viewerEmail) params.set("viewerEmail", viewerEmail);
      const res = await fetch("/api/gs/trip?" + params.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Nem sikerült betölteni az utazást.");
      }
      setTrip(data);
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
      const params = new URLSearchParams();
      params.set("id", tripId);
      if (viewerEmail) params.set("viewerEmail", viewerEmail);
      const res = await fetch("/api/gs/list-files?" + params.toString());
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

  async function openFileModal(file) {
    try {
      setModalOpen(true);
      setModalLoading(true);
      setModalError("");
      setModalDataUrl("");
      setModalMime("");
      setModalTitle(file.name || "");

      const params = new URLSearchParams();
      params.set("tripId", tripId);
      params.set("fileId", file.id);
      if (viewerEmail) params.set("viewerEmail", viewerEmail);

      const res = await fetch("/api/gs/file64?" + params.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.base64 || !data.mimeType) {
        throw new Error(data.error || "Nem sikerült betölteni a fájlt.");
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

  const isOwner =
    trip &&
    viewerEmail &&
    String(trip.ownerEmail || "").toLowerCase() === viewerEmail.toLowerCase();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Vissza link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <span className="text-lg leading-none">←</span>
            <span>Vissza az utazáslistához</span>
          </Link>
        </div>

        {/* TRIP HEADER – „booking-szerű” kártya */}
        <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 shadow-lg">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="flex-1 text-white">
              {tripLoading && (
                <div className="h-20 animate-pulse rounded-xl bg-white/10" />
              )}
              {tripError && !tripLoading && (
                <div className="rounded-xl bg-red-900/40 px-3 py-2 text-sm text-red-50">
                  {tripError}
                </div>
              )}
              {trip && !tripLoading && !tripError && (
                <>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {trip.title || "Névtelen utazás"}
                  </h1>
                  <p className="mt-1 text-sm text-blue-100">
                    {trip.destination || "Ismeretlen desztináció"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-blue-50">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Mettől:</span>
                      <span>{formatDate(trip.dateFrom)}</span>
                      <span className="mx-1 opacity-60">→</span>
                      <span className="font-semibold">Meddig:</span>
                      <span>{formatDate(trip.dateTo)}</span>
                    </div>
                    <div className="h-4 w-px bg-blue-200/40" />
                    <div>
                      <span className="font-semibold">Létrehozó:</span>{" "}
                      <span>{trip.ownerName || trip.ownerEmail || "Ismeretlen"}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-blue-100/90">
                    Utitársak:{" "}
                    {trip.companions && String(trip.companions).trim()
                      ? String(trip.companions)
                      : "—"}
                  </p>
                </>
              )}
            </div>

            {trip && !tripLoading && !tripError && (
              <div className="flex flex-col items-end gap-2 text-xs text-blue-50">
                {trip.visibility && (
                  <span
                    className={classNames(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                      trip.visibility === "public"
                        ? "bg-emerald-400 text-emerald-900"
                        : "bg-slate-100 text-slate-900"
                    )}
                  >
                    {formatVisibility(trip.visibility)}
                  </span>
                )}
                <div className="rounded-full bg-black/20 px-3 py-1 font-mono text-[10px]">
                  ID: {trip.id}
                </div>
                {isOwner && (
                  <div className="rounded-full bg-black/20 px-3 py-1 text-[11px]">
                    (Te vagy ennek az útnak a tulajdonosa.)
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* FÁJLOK – két hasáb, letisztult UI */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Fotók blokk */}
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Fotók
                </h2>
                <p className="text-[11px] text-slate-500">
                  Limit: {files.limits.maxPhoto} db • jelenleg:{" "}
                  {files.photos.length}
                </p>
              </div>
              {viewerEmail && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    disabled={uploadBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload("photo", file);
                      e.target.value = "";
                    }}
                  />
                  {uploadBusy ? "Feltöltés…" : "Fájl kiválasztása"}
                </label>
              )}
            </div>

            {filesError && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                {filesError}
              </div>
            )}

            {filesLoading && (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl bg-slate-200/80"
                  />
                ))}
              </div>
            )}

            {!filesLoading && files.photos.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Még nincs feltöltött fotó ehhez az utazáshoz.
              </p>
            )}

            {!filesLoading && files.photos.length > 0 && (
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {files.photos.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <PhotoThumb
                      tripId={tripId}
                      file={p}
                      viewerEmail={viewerEmail}
                      onOpen={() => openFileModal(p)}
                    />

                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span
                        className={classNames(
                          "inline-flex items-center rounded-full px-2 py-0.5",
                          p.visibility === "public"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                        )}
                      >
                        {p.visibility === "public" ? "publikus" : "privát"}
                      </span>
                      <span>{bytesToKb(p.size)}</span>
                    </div>

                    {p.canManage && (
                      <div className="flex items-center justify-end gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(p)}
                          className="rounded-full border border-slate-300 px-2 py-0.5 text-slate-700 hover:border-blue-400 hover:text-blue-700"
                        >
                          {p.visibility === "public" ? "Priváttá" : "Publikussá"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="rounded-full border border-red-300 px-2 py-0.5 text-red-600 hover:bg-red-50"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dokumentumok blokk */}
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Dokumentumok
                </h2>
                <p className="text-[11px] text-slate-500">
                  Limit: {files.limits.maxDoc} db • jelenleg:{" "}
                  {files.docs.length}
                </p>
              </div>
              {viewerEmail && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800">
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload("doc", file);
                      e.target.value = "";
                    }}
                  />
                  {uploadBusy ? "Feltöltés…" : "Fájl kiválasztása"}
                </label>
              )}
            </div>

            {filesError && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                {filesError}
              </div>
            )}

            {filesLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-xl bg-slate-200/80"
                  />
                ))}
              </div>
            )}

            {!filesLoading && files.docs.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Még nincs feltöltött dokumentum ehhez az utazáshoz.
              </p>
            )}

            {!filesLoading && files.docs.length > 0 && (
              <ul className="mt-1 space-y-2 text-sm">
                {files.docs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                  >
                    <button
                      type="button"
                      onClick={() => openFileModal(d)}
                      className="flex-1 text-left"
                    >
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {d.mimeType || "ismeretlen típus"} • {bytesToKb(d.size)}
                      </p>
                    </button>

                    <span
                      className={classNames(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px]",
                        d.visibility === "public"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                      )}
                    >
                      {d.visibility === "public" ? "publikus" : "privát"}
                    </span>

                    {d.canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(d)}
                          className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-700 hover:border-blue-400 hover:text-blue-700"
                        >
                          {d.visibility === "public"
                            ? "Priváttá"
                            : "Publikussá"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d)}
                          className="rounded-full border border-red-300 px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Nagykép / doksi MODÁL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="relative flex max-h-full w-full max-w-4xl flex-col rounded-xl bg-slate-900 text-slate-50 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
                <h3 className="truncate text-sm font-medium">{modalTitle}</h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                >
                  Bezárás ✕
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-950/80 p-4">
                {modalLoading && (
                  <div className="flex h-64 items-center justify-center text-sm text-slate-300">
                    Betöltés…
                  </div>
                )}
                {modalError && !modalLoading && (
                  <div className="rounded border border-red-400 bg-red-900/40 px-3 py-2 text-sm text-red-100">
                    {modalError}
                  </div>
                )}
                {!modalLoading && !modalError && modalDataUrl && (
                  <>
                    {modalMime.startsWith("image/") ? (
                      <img
                        src={modalDataUrl}
                        alt={modalTitle}
                        className="mx-auto max-h-[70vh] max-w-full object-contain"
                      />
                    ) : (
                      <iframe
                        title={modalTitle || "Dokumentum"}
                        src={modalDataUrl}
                        className="h-[70vh] w-full rounded bg-white"
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
