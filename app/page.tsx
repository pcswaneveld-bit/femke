"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getVakken, addSamenvatting, type Vak } from "./lib/store";
import PageTour from "./components/PageTour";
import MobielScanBeheer from "./components/MobielScanBeheer";
import { addLog } from "./lib/log";

type Status = "idle" | "loading" | "success" | "error";
type Mode = "upload" | "camera" | "mobiel";
type ScanState = "waiting" | "blurry" | "found";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Laplacian variantie: hogere waarde = scherper beeld
function laplacianVariance(video: HTMLVideoElement): number {
  const w = 320;
  const h = Math.round((320 * video.videoHeight) / video.videoWidth);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(video, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Grijswaarden
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // Laplacian-filter + variantie berekenen
  let sum = 0, sumSq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const v =
        -gray[idx - w - 1] - gray[idx - w] - gray[idx - w + 1]
        - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1]
        - gray[idx + w - 1] - gray[idx + w] - gray[idx + w + 1];
      sum += v; sumSq += v * v; n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

const SCHERPTE_DREMPEL = 80; // hogere waarde = strengere scherpte-eis

export default function Home() {
  const [mode, setMode] = useState<Mode>("camera");
  const [status, setStatus] = useState<Status>("idle");
  const [summary, setSummary] = useState("");
  const [volledigeTekst, setVolledigeTekst] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("waiting");
  // null = geen keuze nodig, 2 = twee pagina's gevonden → keuze tonen
  const [pageChoice, setPageChoice] = useState<2 | null>(null);
  const [vakken, setVakken] = useState<Vak[]>([]);
  const [saveVakId, setSaveVakId] = useState("");
  const [saveHoofdstukId, setSaveHoofdstukId] = useState("");
  const [savePagina, setSavePagina] = useState("");
  const [saved, setSaved] = useState(false);

  const mobielPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setError("");
    } catch {
      setError("Geen toegang tot de camera. Controleer de browserinstellingen.");
    }
  }, []);

  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    // Stop mobiel poll when switching away
    if (mode !== "mobiel") {
      if (mobielPollRef.current) { clearInterval(mobielPollRef.current); mobielPollRef.current = null; }
    }
    setPreview(null);
    setSummary("");
    setStatus("idle");
    setError("");
    setPageChoice(null);
  }, [mode, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);


  // Laad vakken en houd ze up-to-date
  useEffect(() => {
    setVakken(getVakken());
    const refresh = () => setVakken(getVakken());
    window.addEventListener("vakken-updated", refresh);
    return () => window.removeEventListener("vakken-updated", refresh);
  }, []);

  // Reset opslaan-staat bij nieuwe samenvatting
  useEffect(() => {
    setSaveVakId("");
    setSaveHoofdstukId("");
    setSavePagina("");
    setSaved(false);
    setVolledigeTekst("");
  }, [summary]);

  const summarize = useCallback(async (imageBlob: Blob) => {
    setStatus("loading");
    setSummary("");
    setError("");

    const formData = new FormData();
    formData.append("image", imageBlob, "scan.jpg");

    try {
      const res = await fetch("/api/summarize", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Er is een fout opgetreden");
        setStatus("error");
      } else {
        setSummary(data.summary);
        setVolledigeTekst(data.volledigeTekst ?? "");
        setStatus("success");
      }
    } catch {
      setError("Kon de server niet bereiken. Probeer het opnieuw.");
      setStatus("error");
    }
  }, []);

  // Automatic detection loop
  useEffect(() => {
    if (!cameraActive || mode !== "camera" || preview !== null) return;

    let cancelled = false;
    setScanState("waiting");

    async function loop() {
      while (!cancelled) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.videoWidth === 0) {
          await sleep(500);
          continue;
        }

        // Scherptecheck — volledig client-side, geen API-aanroep
        const variantie = laplacianVariance(video);
        if (variantie < SCHERPTE_DREMPEL) {
          setScanState("blurry");
          await sleep(600);
          continue;
        }

        // Downscale for detection
        const detW = 640;
        const detH = Math.round((640 * video.videoHeight) / video.videoWidth);
        const detCanvas = document.createElement("canvas");
        detCanvas.width = detW;
        detCanvas.height = detH;
        detCanvas.getContext("2d")!.drawImage(video, 0, 0, detW, detH);

        try {
          const blob = await new Promise<Blob>((resolve, reject) =>
            detCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.75)
          );

          const formData = new FormData();
          formData.append("image", blob, "detect.jpg");

          const res = await fetch("/api/detect", { method: "POST", body: formData });
          if (!res.ok || cancelled) break;

          const { pages } = await res.json() as { pages: 0 | 1 | 2 };
          if (cancelled) break;

          if (pages >= 1) {
            cancelled = true;
            setScanState("found");

            // Capture full-resolution frame
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d")!.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
            setPreview(dataUrl);

            if (pages === 1) {
              // One page → auto summarize
              const fullBlob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.92)
              );
              await summarize(fullBlob);
            } else {
              // Two pages → ask user
              setPageChoice(2);
            }
            break;
          } else {
            setScanState("waiting");
          }
        } catch {
          // Ignore, keep looping
        }

        if (!cancelled) await sleep(1500);
      }
    }

    loop();
    return () => { cancelled = true; };
  }, [cameraActive, mode, preview, summarize]);

  async function handlePageChoice(side: "left" | "right" | "both") {
    if (!preview) return;
    setPageChoice(null);

    if (side === "both") {
      const res = await fetch(preview);
      const blob = await res.blob();
      await summarize(blob);
      return;
    }

    const img = new Image();
    img.src = preview;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); });

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.floor(img.width / 2);
    cropCanvas.height = img.height;
    const ctx = cropCanvas.getContext("2d")!;
    const sx = side === "right" ? Math.floor(img.width / 2) : 0;
    ctx.drawImage(img, sx, 0, cropCanvas.width, img.height, 0, 0, cropCanvas.width, img.height);

    const blob = await new Promise<Blob>((resolve, reject) =>
      cropCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.92)
    );
    await summarize(blob);
  }

  function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const pagina = parseInt(savePagina);
    if (!saveVakId || !saveHoofdstukId || !pagina || !summary) return;
    const vak = vakken.find((v) => v.id === saveVakId);
    const hoofdstuk = vak?.hoofdstukken.find((h) => h.id === saveHoofdstukId);
    addSamenvatting(saveVakId, saveHoofdstukId, pagina, summary, volledigeTekst);
    addLog(`Samenvatting opgeslagen — ${vak?.naam ?? ""} › ${hoofdstuk?.naam ?? ""}, pagina ${pagina}`);
    setSaved(true);
  }

  function resetCamera() {
    setPreview(null);
    setSummary("");
    setStatus("idle");
    setError("");
    setPageChoice(null);
    setScanState("waiting");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setSummary("");
    setError("");
    setStatus("idle");
  }

  async function handleUploadSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    await summarize(file);
  }

  const borderClass =
    scanState === "found" ? "border-green-400 shadow-lg shadow-green-500/20" :
    scanState === "blurry" ? "border-amber-400 shadow-lg shadow-amber-400/20" :
    "border-purple-900";
  const bannerText =
    scanState === "found" ? "Pagina herkend! Foto wordt gemaakt…" :
    scanState === "blurry" ? "Wazig — houd het boek stil en dichterbij 🔍" :
    "Houd het boek voor de camera 📖";
  const bannerBg =
    scanState === "found" ? "bg-green-600" :
    scanState === "blurry" ? "bg-amber-500" :
    "bg-black/60 backdrop-blur-sm";

  return (
    <main className="flex-1 min-h-screen bg-slate-200 py-10 px-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-1">Samenvatting maken</h1>
          <p className="text-indigo-500 text-sm">Scan een pagina en krijg direct een handige studiesamenvatting ✨</p>
        </div>

        {/* Mode toggle */}
        <div data-ptour="mode-toggle" className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm border border-purple-100 w-fit">
          {(["camera", "upload", "mobiel"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md"
                  : "text-purple-400 hover:text-purple-600"
              }`}
            >
              {m === "camera" ? "📷 Camera" : m === "upload" ? "🖼️ Foto uploaden" : "📱 Scan met mobiel"}
            </button>
          ))}
        </div>

        {/* Camera mode */}
        {mode === "camera" && (
          <div className="space-y-4">
            <div className={`relative w-full rounded-2xl overflow-hidden bg-black aspect-video border-2 transition-all duration-300 ${borderClass}`}>
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${preview ? "hidden" : "block"}`} />
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Scan" className="w-full h-full object-contain" />
              )}
              {!preview && (
                <div className={`absolute bottom-0 left-0 right-0 px-4 py-2.5 text-white text-sm text-center font-medium transition-all duration-300 ${bannerBg}`}>
                  {bannerText}
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {pageChoice === 2 && (
              <div className="p-5 bg-white rounded-2xl border border-purple-100 shadow-sm">
                <p className="text-sm font-semibold text-purple-700 mb-3">
                  Twee pagina&apos;s zichtbaar — welke wil je samenvatten?
                </p>
                <div className="flex gap-2">
                  {[
                    { label: "⬅️ Linker pagina", side: "left" as const },
                    { label: "➡️ Rechter pagina", side: "right" as const },
                    { label: "📄 Beide pagina's", side: "both" as const },
                  ].map(({ label, side }) => (
                    <button key={side} onClick={() => handlePageChoice(side)}
                      className="flex-1 py-2 px-3 text-sm font-medium rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:opacity-90 transition-opacity shadow-md">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {preview && !pageChoice && (
              <button onClick={resetCamera} disabled={status === "loading"}
                className="w-full py-3 px-6 border-2 border-purple-200 text-purple-600 font-medium rounded-xl hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                🔄 Volgende pagina scannen
              </button>
            )}
          </div>
        )}

        {/* Mobiel scan mode */}
        {mode === "mobiel" && <MobielScanBeheer />}

        {/* Upload mode */}
        {mode === "upload" && (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <label
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-purple-200 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all bg-white overflow-hidden relative"
              htmlFor="image-upload"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Voorvertoning" className="absolute inset-0 w-full h-full object-contain p-2" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-purple-300">
                  <span className="text-4xl">📁</span>
                  <span className="text-sm font-medium text-purple-500">Klik om een foto te kiezen</span>
                  <span className="text-xs">JPEG, PNG, WebP of GIF</span>
                </div>
              )}
            </label>
            <input id="image-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" ref={inputRef} onChange={handleFileChange} />
            <button type="submit" disabled={!preview || status === "loading"}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
              {status === "loading" ? "Bezig…" : "✨ Maak samenvatting"}
            </button>
          </form>
        )}

        {/* Loading */}
        {status === "loading" && (
          <div className="mt-8 flex items-center gap-3 p-4 bg-white rounded-2xl border border-purple-100 shadow-sm">
            <div className="w-8 h-8 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-700">AI is aan het werk…</p>
              <p className="text-xs text-purple-400">Even geduld, de samenvatting wordt gemaakt</p>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Summary */}
        {status === "success" && summary && (
          <div className="mt-8 space-y-4">
            <div className="p-6 bg-white rounded-2xl border border-purple-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">📝</span>
                <h2 className="text-lg font-bold text-purple-800">Jouw samenvatting</h2>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                {summary}
              </div>
            </div>

            {/* Opslaan */}
            <div className="p-5 bg-white rounded-2xl border border-purple-100 shadow-sm">
              {saved ? (
                <p className="text-sm font-semibold text-green-600 flex items-center gap-2">
                  <span>✅</span> Opgeslagen!
                </p>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                    <span>💾</span> Opslaan in je notities
                  </h3>
                  {vakken.length === 0 ? (
                    <p className="text-sm text-purple-300">Voeg eerst een vak toe via het menu links.</p>
                  ) : (
                    <form onSubmit={handleSave} className="flex flex-wrap gap-2 items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-purple-400">Vak</label>
                        <select value={saveVakId} onChange={(e) => { setSaveVakId(e.target.value); setSaveHoofdstukId(""); }}
                          className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400">
                          <option value="">Kies vak…</option>
                          {vakken.map((v) => <option key={v.id} value={v.id}>{v.naam}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-purple-400">Hoofdstuk</label>
                        <select value={saveHoofdstukId} onChange={(e) => setSaveHoofdstukId(e.target.value)} disabled={!saveVakId}
                          className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400 disabled:opacity-40">
                          <option value="">Kies hoofdstuk…</option>
                          {vakken.find((v) => v.id === saveVakId)?.hoofdstukken.map((h) => <option key={h.id} value={h.id}>{h.naam}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-purple-400">Pagina</label>
                        <input type="number" min={1} value={savePagina} onChange={(e) => setSavePagina(e.target.value)} placeholder="bijv. 42"
                          className="w-24 px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400" />
                      </div>
                      <button type="submit" disabled={!saveVakId || !saveHoofdstukId || !savePagina}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-lg shadow-md shadow-purple-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                        Opslaan
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <PageTour stappen={[
        { emoji: "📷", titel: "Samenvattingen maken", beschrijving: "Op deze pagina scan je je schoolboek. AI leest de pagina en maakt direct een samenvatting van wat je moet weten voor de toets." },
        { target: "mode-toggle", emoji: "🔄", titel: "Camera of foto uploaden", beschrijving: "Kies 'Camera' om je boek live te scannen — de app herkent automatisch wanneer de pagina scherp is. Of kies 'Foto uploaden' als je al een foto hebt." },
        { emoji: "📁", titel: "Opslaan in hoofdstuk", beschrijving: "Na het scannen kies je in welk vak en hoofdstuk de samenvatting wordt opgeslagen. Zo kun je later per hoofdstuk oefenen en alles terugvinden." },
      ]} />
    </main>
  );
}
