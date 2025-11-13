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

// Dokumentum mime → emberi típus
function prettyType(mime) {
  if (!mime) return "Ismeretlen típus";
  const m = String(mime).toLowerCase();

  if (m === "application/pdf") return "PDF";
  if (m.startsWith("image/")) return "Kép";
  if (m.includes("word") || m.includes("officedocument.word")) return "Word";
  if (m.includes("sheet") || m.includes("officedocument.spreadsheet"))
    return "Táblázat";
  if (m.includes("presentation")) return "Prezentáció";

  return mime; // fallback: az eredeti mime
}

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

// ======== Közös segéd: fájl → base64 ========

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

// ======== Közös UI: Kebab menü ========

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
            "absolute z-20 mt-1 w-40 origin-top rounded-md bg-white py-1 text-xs text-slate-700 shadow-lg ring-1 ring-black/5",
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

// ======== Fotó thumb ========

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
      className="group block w-full overflow-hidden rounded-xl bg-slate-200 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-blue-400"
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

      {/* Alsó overlay – később ide jöhet leírás / címke */}
      {/* Most nem mutatunk fájlnevet, hogy tiszta maradjon a grid */}
    </button>
  );
}

// ======== Fő komponens: Trip oldal ========

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
                      <span>
                        {trip.ownerName || trip.ownerEmail || "Ismeretlen"}
                      </span>
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
                {isOwner && (
                  <div className="rounded-full bg-black/20 px-3 py-1 text-[11px]">
                    (Te vagy ennek az útnak a tulajdonosa.)
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* FÁJLOK – két hasáb, kebab menükkel */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Fotók blokk */}
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Fotók</h2>
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
              <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {files.photos.map((p) => {
                  const isPublic = p.visibility === "public";
                  const canManage = !!p.canManage;

                  const menuItems = [
                    {
                      label: "Megnyitás",
                      onClick: () => openFileModal(p),
                    },
                  ];

                  if (canManage) {
                    menuItems.push({
                      label: isPublic ? "Priváttá tétel" : "Publikussá tétel",
                      onClick: () => handleToggleVisibility(p),
                    });
                    menuItems.push({
                      label: "Törlés",
                      danger: true,
                      onClick: () => handleDelete(p),
                    });
                  }

                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="relative">
                        <PhotoThumb
                          tripId={tripId}
                          file={p}
                          viewerEmail={viewerEmail}
                          onOpen={() => openFileModal(p)}
                        />
                        {/* Láthatóság jelző kis pont */}
                        <div className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 text-[10px]">
                          <span
                            className={classNames(
                              "inline-block h-2.5 w-2.5 rounded-full border border-white/60",
                              isPublic ? "bg-emerald-400" : "bg-slate-400"
                            )}
                          />
                        </div>
                        {/* Kebab menü */}
                        <div className="absolute right-1.5 top-1.5">
                          <KebabMenu items={menuItems} />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                {files.docs.map((d) => {
                  const isPublic = d.visibility === "public";
                  const canManage = !!d.canManage;

                  const menuItems = [
                    {
                      label: "Megnyitás",
                      onClick: () => openFileModal(d),
                    },
                  ];

                  if (canManage) {
                    menuItems.push({
                      label: isPublic ? "Priváttá tétel" : "Publikussá tétel",
                      onClick: () => handleToggleVisibility(d),
                    });
                    menuItems.push({
                      label: "Törlés",
                      danger: true,
                      onClick: () => handleDelete(d),
                    });
                  }

                  return (
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
                          {prettyType(d.mimeType)} • {bytesToKb(d.size)}
                        </p>
                      </button>

                      {/* Láthatóság jelző pötty */}
                      <span
                        className={classNames(
                          "inline-block h-2.5 w-2.5 rounded-full border border-white/80",
                          isPublic ? "bg-emerald-400" : "bg-slate-400"
                        )}
                        title={isPublic ? "Publikus" : "Privát"}
                      />

                      <KebabMenu items={menuItems} />
                    </li>
                  );
                })}
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