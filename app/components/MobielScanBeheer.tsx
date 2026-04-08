"use client";

import { useState, useRef, useEffect } from "react";
import QRCode from "./QRCode";
import { getVakken, addVak, addHoofdstuk, addSamenvatting, type Vak } from "../lib/store";
import { addLog } from "../lib/log";

// ─── Types ──────────────────────────────────────────────────────────────────

type FotoStatus = "laden" | "klaar" | "fout";

type MobielFoto = {
  id: string;
  image: string;
  status: FotoStatus;
  summary: string;
  volledigeTekst: string;
  paginaDetected: number | null;
  vakDetected: string | null; // AI-detected subject name
  pagina: string;
  opgeslagen: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MobielScanBeheer() {
  const [sessieUrl, setSessieUrl] = useState<string | null>(null);
  const [sessieAanmaken, setSessieAanmaken] = useState(false);
  const [aantalOntvangen, setAantalOntvangen] = useState(0);
  const [fotos, setFotos] = useState<MobielFoto[]>([]);
  const [vakken, setVakken] = useState<Vak[]>([]);

  // ── Gedeelde vak/hoofdstuk selectie ──
  // Zodra de gebruiker dit eenmalig kiest, geldt het voor alle foto's
  const [gedeeldVakId, setGedeeldVakId] = useState("");
  const [gedeeldHoofdstukId, setGedeeldHoofdstukId] = useState("");
  const [nieuwVakTonen, setNieuwVakTonen] = useState(false);
  const [nieuwVakNaam, setNieuwVakNaam] = useState("");
  const [nieuwHoofdstukTonen, setNieuwHoofdstukTonen] = useState(false);
  const [nieuwHoofdstukNaam, setNieuwHoofdstukNaam] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sinceRef = useRef(0);
  // We need current vakken in the voegFotoToe callback without stale closure
  const vakkenRef = useRef<Vak[]>([]);

  useEffect(() => {
    const v = getVakken();
    setVakken(v);
    vakkenRef.current = v;
    const refresh = () => {
      const updated = getVakken();
      setVakken(updated);
      vakkenRef.current = updated;
    };
    window.addEventListener("vakken-updated", refresh);
    return () => window.removeEventListener("vakken-updated", refresh);
  }, []);

  useEffect(() => {
    startSessie();
    return () => stopPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function startSessie() {
    stopPoll();
    setSessieAanmaken(true);
    setSessieUrl(null);
    setAantalOntvangen(0);
    sinceRef.current = 0;
    setFotos([]);

    const res = await fetch("/api/mobiel/sessie", { method: "POST" });
    const data = await res.json();
    setSessieUrl(data.url);
    setSessieAanmaken(false);

    pollRef.current = setInterval(async () => {
      const poll = await fetch(`/api/mobiel/poll/${data.sessionId}?since=${sinceRef.current}`);
      if (!poll.ok) return;
      const pollData = await poll.json();
      if (pollData.images?.length > 0) {
        sinceRef.current = pollData.total;
        setAantalOntvangen(pollData.total);
        for (const image of pollData.images) voegFotoToe(image);
      }
    }, 2000);
  }

  async function voegFotoToe(image: string) {
    const id = crypto.randomUUID();
    setFotos((prev) => [{
      id, image, status: "laden",
      summary: "", volledigeTekst: "",
      paginaDetected: null, vakDetected: null,
      pagina: "", opgeslagen: false,
    }, ...prev]);

    try {
      const resp = await fetch(image);
      const blob = await resp.blob();
      const formData = new FormData();
      formData.append("image", blob, "scan.jpg");
      const res = await fetch("/api/summarize", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        // Try to match detected vak name against existing vakken
        const detectedVakNaam: string | null = data.vakNaam ?? null;
        let autoVakId = "";
        if (detectedVakNaam) {
          const match = vakkenRef.current.find(
            (v) => v.naam.toLowerCase() === detectedVakNaam.toLowerCase()
          );
          if (match) autoVakId = match.id;
        }

        setFotos((prev) => prev.map((f) => f.id === id ? {
          ...f,
          status: "klaar",
          summary: data.summary ?? "",
          volledigeTekst: data.volledigeTekst ?? "",
          paginaDetected: data.paginanummer ?? null,
          vakDetected: detectedVakNaam,
          pagina: data.paginanummer ? String(data.paginanummer) : "",
          // Pre-fill vak if AI matched an existing vak and user hasn't set a shared one yet
          ...(autoVakId && !gedeeldVakId ? { _autoVakId: autoVakId } : {}),
        } : f));

        // Als AI een vak herkent dat bestaat en er nog geen gedeelde keuze is: stel gedeeld vak in
        if (autoVakId) {
          setGedeeldVakId((prev) => prev || autoVakId);
        }
      } else {
        setFotos((prev) => prev.map((f) =>
          f.id === id ? { ...f, status: "fout", summary: data.error ?? "Fout" } : f
        ));
      }
    } catch {
      setFotos((prev) => prev.map((f) =>
        f.id === id ? { ...f, status: "fout", summary: "Kon server niet bereiken" } : f
      ));
    }
  }

  function updateFoto(id: string, patch: Partial<MobielFoto>) {
    setFotos((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }

  function slaOp(foto: MobielFoto) {
    const pagina = parseInt(foto.pagina);
    if (!gedeeldVakId || !gedeeldHoofdstukId || !pagina || !foto.summary) return;
    const vak = vakken.find((v) => v.id === gedeeldVakId);
    const hoofdstuk = vak?.hoofdstukken.find((h) => h.id === gedeeldHoofdstukId);
    addSamenvatting(gedeeldVakId, gedeeldHoofdstukId, pagina, foto.summary, foto.volledigeTekst);
    addLog(`Samenvatting opgeslagen — ${vak?.naam ?? ""} › ${hoofdstuk?.naam ?? ""}, pagina ${pagina}`);
    updateFoto(foto.id, { opgeslagen: true });
  }

  function maakNieuwVak() {
    if (!nieuwVakNaam.trim()) return;
    const vak = addVak(nieuwVakNaam.trim());
    addLog(`Vak toegevoegd — ${vak.naam}`);
    setNieuwVakNaam("");
    setNieuwVakTonen(false);
    setGedeeldVakId(vak.id);
    setGedeeldHoofdstukId("");
  }

  function maakNieuwHoofdstuk() {
    if (!gedeeldVakId || !nieuwHoofdstukNaam.trim()) return;
    const h = addHoofdstuk(gedeeldVakId, nieuwHoofdstukNaam.trim());
    setNieuwHoofdstukNaam("");
    setNieuwHoofdstukTonen(false);
    setGedeeldHoofdstukId(h.id);
  }

  const gedeeldVak = vakken.find((v) => v.id === gedeeldVakId);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* QR + status */}
      <div className="p-5 bg-white rounded-2xl border border-purple-100 shadow-sm flex flex-col items-center gap-4 text-center">
        {sessieAanmaken ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-8 h-8 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
            <p className="text-sm text-purple-500">Sessie aanmaken…</p>
          </div>
        ) : sessieUrl ? (
          <>
            <div>
              <p className="text-sm font-bold text-indigo-900 mb-1">Scan met je telefoon</p>
              <p className="text-xs text-slate-400">Zorg dat je telefoon op hetzelfde wifi-netwerk zit</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-purple-50 shadow-inner">
              <QRCode value={sessieUrl} size={160} />
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-500">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              {aantalOntvangen === 0
                ? "Wachten op foto's van je telefoon…"
                : `${aantalOntvangen} foto${aantalOntvangen !== 1 ? "'s" : ""} ontvangen — stuur gerust meer`}
            </div>
            <button onClick={startSessie} className="text-xs text-slate-400 hover:text-purple-500 transition-colors underline underline-offset-2">
              Nieuwe QR-code genereren
            </button>
          </>
        ) : null}
      </div>

      {/* Gedeelde vak/hoofdstuk selectie — toont zodra er foto's zijn */}
      {fotos.length > 0 && (
        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-indigo-700">📚 Vak &amp; hoofdstuk voor alle foto's</p>

          {/* Vak */}
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              {gedeeldVakId && gedeeldVak ? (
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${gedeeldVak.kleur} shrink-0`} />
                  <span className="text-sm font-semibold text-indigo-900">{gedeeldVak.naam}</span>
                  <button onClick={() => { setGedeeldVakId(""); setGedeeldHoofdstukId(""); }} className="text-xs text-slate-400 hover:text-red-400 ml-1">✕</button>
                </div>
              ) : (
                <select
                  value={gedeeldVakId}
                  onChange={(e) => { setGedeeldVakId(e.target.value); setGedeeldHoofdstukId(""); }}
                  className="w-full px-2 py-1.5 text-sm bg-white border border-indigo-200 rounded-lg text-indigo-900 outline-none"
                >
                  <option value="">Kies vak…</option>
                  {vakken.map((v) => <option key={v.id} value={v.id}>{v.naam}</option>)}
                </select>
              )}
            </div>
            <button
              onClick={() => setNieuwVakTonen((t) => !t)}
              className="px-2 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-bold"
              title="Nieuw vak"
            >➕</button>
          </div>

          {nieuwVakTonen && (
            <div className="flex gap-2">
              <input
                value={nieuwVakNaam}
                onChange={(e) => setNieuwVakNaam(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && maakNieuwVak()}
                placeholder="Naam nieuw vak…"
                className="flex-1 px-2 py-1.5 text-sm border border-indigo-300 rounded-lg outline-none"
                autoFocus
              />
              <button onClick={maakNieuwVak} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-semibold">Aanmaken</button>
            </div>
          )}

          {/* Hoofdstuk */}
          {gedeeldVakId && (
            <>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  {gedeeldHoofdstukId && gedeeldVak?.hoofdstukken.find((h) => h.id === gedeeldHoofdstukId) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-indigo-900">
                        {gedeeldVak.hoofdstukken.find((h) => h.id === gedeeldHoofdstukId)?.naam}
                      </span>
                      <button onClick={() => setGedeeldHoofdstukId("")} className="text-xs text-slate-400 hover:text-red-400 ml-1">✕</button>
                    </div>
                  ) : (
                    <select
                      value={gedeeldHoofdstukId}
                      onChange={(e) => setGedeeldHoofdstukId(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-white border border-indigo-200 rounded-lg text-indigo-900 outline-none"
                    >
                      <option value="">Kies hoofdstuk…</option>
                      {gedeeldVak?.hoofdstukken.map((h) => <option key={h.id} value={h.id}>{h.naam}</option>)}
                    </select>
                  )}
                </div>
                <button
                  onClick={() => setNieuwHoofdstukTonen((t) => !t)}
                  className="px-2 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-bold"
                  title="Nieuw hoofdstuk"
                >➕</button>
              </div>

              {nieuwHoofdstukTonen && (
                <div className="flex gap-2">
                  <input
                    value={nieuwHoofdstukNaam}
                    onChange={(e) => setNieuwHoofdstukNaam(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && maakNieuwHoofdstuk()}
                    placeholder="Naam nieuw hoofdstuk…"
                    className="flex-1 px-2 py-1.5 text-sm border border-indigo-300 rounded-lg outline-none"
                    autoFocus
                  />
                  <button onClick={maakNieuwHoofdstuk} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-semibold">Aanmaken</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Fotokaarten */}
      {fotos.map((foto) => (
        <div key={foto.id} className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">

          <div className="flex gap-4 p-4">
            {/* Thumbnail */}
            <div className="shrink-0 w-24 h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.image} alt="Scan" className="w-full h-full object-cover" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {foto.vakDetected && (
                <p className="text-xs text-indigo-400 mb-1">
                  🤖 Herkend vak: <span className="font-semibold">{foto.vakDetected}</span>
                  {!vakken.find((v) => v.naam.toLowerCase() === foto.vakDetected!.toLowerCase()) && (
                    <span className="text-slate-400"> (niet gevonden in jouw vakken)</span>
                  )}
                </p>
              )}
              {foto.status === "laden" && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-5 h-5 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin shrink-0" />
                  <p className="text-sm text-purple-400">Samenvatting maken…</p>
                </div>
              )}
              {foto.status === "fout" && (
                <p className="text-sm text-red-500 mt-2">⚠️ {foto.summary}</p>
              )}
              {foto.status === "klaar" && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 mb-1">📝 Samenvatting</p>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-6 whitespace-pre-wrap">{foto.summary}</p>
                </div>
              )}
            </div>
          </div>

          {/* Opslaan */}
          {foto.status === "klaar" && (
            <div className="border-t border-purple-50 px-4 py-3 bg-purple-50/40">
              {foto.opgeslagen ? (
                <p className="text-sm font-semibold text-green-600 flex items-center gap-2">✅ Opgeslagen!</p>
              ) : (
                <div className="flex gap-2 items-end">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs text-purple-400">
                      Pagina{foto.paginaDetected ? ` (herkend: ${foto.paginaDetected})` : ""}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={foto.pagina}
                      onChange={(e) => updateFoto(foto.id, { pagina: e.target.value })}
                      placeholder="bijv. 42"
                      className="w-24 px-2 py-1.5 text-sm bg-white border border-purple-200 rounded-lg outline-none"
                    />
                  </div>
                  {!gedeeldVakId || !gedeeldHoofdstukId ? (
                    <p className="text-xs text-amber-500 pb-1">↑ Kies eerst vak &amp; hoofdstuk hierboven</p>
                  ) : (
                    <button
                      onClick={() => slaOp(foto)}
                      disabled={!foto.pagina}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold rounded-lg shadow disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Opslaan
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
