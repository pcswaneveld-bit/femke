"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { getVakken, type Vak, type Hoofdstuk } from "../../../lib/store";
import {
  getVoortgang, registreerWoorden, registreerOverhoring, registreerPaginaScores,
  STERREN, type Ster, type VoortgangData,
} from "../../../lib/voortgang";
import PageTour from "../../../components/PageTour";
import { addLog } from "../../../lib/log";

type Mode = "paginakeuze" | "keuze" | "woorden" | "overhoren";
type WoordenStap = "laden" | "richting" | "oefenen" | "klaar";
type OverhoorStap = "laden" | "vragen" | "beoordelen" | "resultaat";

type Woordpaar = { vreemd: string; nederlands: string };
type Richting = "vreemdNaarNl" | "nlNaarVreemd";

const TAALVAKKEN = [
  "frans", "engels", "duits", "grieks", "latijn", "spaans",
  "italiaans", "russisch", "arabisch", "chinees", "japans",
  "portugees", "turks", "hebreeuws", "pools", "zweeds",
];

function isTaalVak(naam: string): boolean {
  const lower = naam.toLowerCase();
  return TAALVAKKEN.some((t) => lower.includes(t));
}

function normaliseer(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export default function OefenenPage() {
  const { vakId, hoofdstukId } = useParams<{ vakId: string; hoofdstukId: string }>();
  const [vak, setVak] = useState<Vak | null>(null);
  const [hoofdstuk, setHoofdstuk] = useState<Hoofdstuk | null>(null);

  // Woorden state
  const [woordenStap, setWoordenStap] = useState<WoordenStap>("laden");
  const [woordparen, setWoordparen] = useState<Woordpaar[]>([]);
  const [richting, setRichting] = useState<Richting>("vreemdNaarNl");
  const [oefeWoorden, setOefeWoorden] = useState<Woordpaar[]>([]);
  const [oefeIndex, setOefeIndex] = useState(0);
  const [typInput, setTypInput] = useState("");
  const [gecontroleerd, setGecontroleerd] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [score, setScore] = useState({ goed: 0, fout: 0 });
  const [woordenLaadFout, setWoordenLaadFout] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Overhoren state
  const [overhoorStap, setOverhoorStap] = useState<OverhoorStap>("laden");
  const [vragen, setVragen] = useState<string[]>([]);
  const [paginaPerVraag, setPaginaPerVraag] = useState<number[] | null>(null);
  const paginaPerVraagRef = useRef<number[] | null>(null); // ref for use in async closures
  const [antwoorden, setAntwoorden] = useState<string[]>([]);
  const [huidigVraagIdx, setHuidigVraagIdx] = useState(0);
  const [huidigAntwoord, setHuidigAntwoord] = useState("");
  const [beoordeling, setBeoordeling] = useState<{
    beoordelingen: { correct: boolean; feedback: string; juistAntwoord: string }[];
    score: number;
    totaal: number;
    slotwoord: string;
  } | null>(null);

  const [mode, setMode] = useState<Mode>("paginakeuze");
  const [voortgang, setVoortgang] = useState<VoortgangData | null>(null);
  const [nieuweSterren, setNieuweSterren] = useState<Ster[]>([]);

  // Pagina-selectie: null = heel hoofdstuk
  const [geselecteerdePaginas, setGeselecteerdePaginas] = useState<number[] | null>(null);

  useEffect(() => {
    const v = getVakken().find((v) => v.id === vakId) ?? null;
    setVak(v);
    setHoofdstuk(v?.hoofdstukken.find((h) => h.id === hoofdstukId) ?? null);
    setVoortgang(getVoortgang(hoofdstukId));
  }, [vakId, hoofdstukId]);

  function toonNieuweSterren(sterren: Ster[]) {
    if (!sterren.length) return;
    sterren.forEach((s) => addLog(`Ster verdiend — ${s.niveau === "brons" ? "🥉" : s.niveau === "zilver" ? "🥈" : "🥇"} ${s.naam}`));
    setNieuweSterren(sterren);
    setVoortgang(getVoortgang(hoofdstukId));
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { x: 0.1, y: 0.5 }, angle: 60 }), 250);
    setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { x: 0.9, y: 0.5 }, angle: 120 }), 250);
  }

  useEffect(() => {
    if (gecontroleerd) inputRef.current?.focus();
  }, [gecontroleerd]);

  if (!vak || !hoofdstuk) return null;

  const isTaal = isTaalVak(vak.naam);

  // Gefilterde samenvattingen op basis van pagina-selectie
  const gefilterdeSamenvattingen = geselecteerdePaginas === null
    ? hoofdstuk.samenvattingen
    : hoofdstuk.samenvattingen.filter((s) => geselecteerdePaginas.includes(s.paginanummer));

  const geselecteerdePaginaNummers = gefilterdeSamenvattingen.map((s) => s.paginanummer);

  // Kleur op basis van besteScore (0–100)
  function scoreKleur(score: number | undefined): string {
    if (score === undefined) return "bg-slate-100 border-slate-200 text-slate-400";
    if (score >= 80) return "bg-emerald-50 border-emerald-300 text-emerald-700";
    if (score >= 60) return "bg-amber-50 border-amber-300 text-amber-700";
    if (score >= 1) return "bg-rose-50 border-rose-300 text-rose-700";
    return "bg-slate-100 border-slate-200 text-slate-500";
  }
  function scoreLabel(score: number | undefined, sessies: number | undefined): string {
    if (!sessies) return "Nog niet geoefend";
    if (score === undefined) return "Nog niet geoefend";
    if (score >= 80) return `${score}% ✓`;
    if (score >= 60) return `${score}% ~`;
    return `${score}% ✗`;
  }

  // ── Woorden laden ─────────────────────────────────────────────────────────

  async function startWoorden() {
    setMode("woorden");
    setWoordenStap("laden");
    setWoordenLaadFout(false);
    setWoordparen([]);

    const alleTekst = hoofdstuk!.samenvattingen
      .map((s) => (s.volledigeTekst ?? "") + " " + s.inhoud)
      .join("\n\n");

    const res = await fetch("/api/woordparen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tekst: alleTekst }),
    });
    const data = await res.json();

    if (!data.paren?.length) {
      setWoordenLaadFout(true);
      setWoordenStap("laden");
      return;
    }
    setWoordparen(data.paren);
    setWoordenStap("richting");
  }

  function startOefenen() {
    const gemengd = [...woordparen].sort(() => Math.random() - 0.5);
    setOefeWoorden(gemengd);
    setOefeIndex(0);
    setTypInput("");
    setGecontroleerd(false);
    setScore({ goed: 0, fout: 0 });
    setWoordenStap("oefenen");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function controleer() {
    const juist = richting === "vreemdNaarNl"
      ? oefeWoorden[oefeIndex].nederlands
      : oefeWoorden[oefeIndex].vreemd;
    const isCorrect = normaliseer(typInput) === normaliseer(juist);
    setCorrect(isCorrect);
    setGecontroleerd(true);
    setScore((prev) => ({ ...prev, goed: prev.goed + (isCorrect ? 1 : 0), fout: prev.fout + (isCorrect ? 0 : 1) }));
    if (isCorrect) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
  }

  function volgendWoord() {
    if (oefeIndex + 1 >= oefeWoorden.length) {
      const verdiend = registreerWoorden(hoofdstukId, score.goed, oefeWoorden.length);
      addLog(`Woordjes geoefend — ${vak?.naam} › ${hoofdstuk?.naam}: ${score.goed}/${oefeWoorden.length} goed`);
      // Sla per-pagina score op (zelfde % voor alle geselecteerde pagina's)
      const pct = oefeWoorden.length > 0 ? Math.round(((score.goed + 1) / oefeWoorden.length) * 100) : 0;
      const paginaScores: Record<string, number> = {};
      geselecteerdePaginaNummers.forEach((p) => { paginaScores[String(p)] = pct; });
      if (Object.keys(paginaScores).length) registreerPaginaScores(hoofdstukId, paginaScores);
      toonNieuweSterren(verdiend);
      setVoortgang(getVoortgang(hoofdstukId));
      setWoordenStap("klaar");
    } else {
      setOefeIndex((i) => i + 1);
      setTypInput("");
      setGecontroleerd(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  // ── Overhoren ─────────────────────────────────────────────────────────────

  async function startOverhoren() {
    setMode("overhoren");
    setOverhoorStap("laden");
    setVragen([]);
    setPaginaPerVraag(null);
    paginaPerVraagRef.current = null;
    setAntwoorden([]);
    setHuidigVraagIdx(0);
    setHuidigAntwoord("");
    setBeoordeling(null);

    // Stuur per-pagina stof mee zodat de API per pagina vragen kan genereren
    const paginas = gefilterdeSamenvattingen.map((s) => ({
      pagina: s.paginanummer,
      tekst: (s.volledigeTekst ?? "") + " " + s.inhoud,
    }));

    const res = await fetch("/api/overhoren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paginas }),
    });
    const data = await res.json();
    setVragen(data.vragen ?? []);
    const ppv = data.paginaPerVraag ?? null;
    setPaginaPerVraag(ppv);
    paginaPerVraagRef.current = ppv;
    setAntwoorden(new Array(data.vragen?.length ?? 0).fill(""));
    setOverhoorStap("vragen");
  }

  function handleVolgende() {
    const bijgewerkt = [...antwoorden];
    bijgewerkt[huidigVraagIdx] = huidigAntwoord;
    setAntwoorden(bijgewerkt);
    if (huidigVraagIdx + 1 < vragen.length) {
      setHuidigVraagIdx(huidigVraagIdx + 1);
      setHuidigAntwoord(bijgewerkt[huidigVraagIdx + 1] ?? "");
    } else {
      controleerAntwoorden(bijgewerkt);
    }
  }

  async function controleerAntwoorden(gegeven: string[]) {
    setOverhoorStap("beoordelen");
    const payload = vragen.map((v, i) => ({
      vraag: v,
      antwoord: gegeven[i] ?? "",
      pagina: paginaPerVraag?.[i] ?? undefined,
    }));
    const paginas = gefilterdeSamenvattingen.map((s) => ({
      pagina: s.paginanummer,
      tekst: (s.volledigeTekst ?? "") + " " + s.inhoud,
    }));
    const res = await fetch("/api/overhoren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paginas, antwoorden: payload }),
    });
    const data = await res.json();
    setBeoordeling(data);
    setOverhoorStap("resultaat");
    if (data.score !== undefined) {
      addLog(`Overhoring gedaan — ${vak?.naam} › ${hoofdstuk?.naam}: ${data.score}/${data.totaal} goed`);
      const verdiend = registreerOverhoring(hoofdstukId, data.score, data.totaal);

      // Bereken score per pagina op basis van welke vragen bij welke pagina horen
      const paginaScores: Record<string, number> = {};
      if (paginaPerVraagRef.current && data.beoordelingen) {
        // Groepeer vragen per pagina
        const perPagina: Record<string, { goed: number; totaal: number }> = {};
        paginaPerVraagRef.current.forEach((pagina, i) => {
          const key = String(pagina);
          if (!perPagina[key]) perPagina[key] = { goed: 0, totaal: 0 };
          perPagina[key].totaal++;
          if (data.beoordelingen[i]?.correct) perPagina[key].goed++;
        });
        for (const [pagina, { goed, totaal }] of Object.entries(perPagina)) {
          paginaScores[pagina] = totaal > 0 ? Math.round((goed / totaal) * 100) : 0;
        }
      } else {
        // Geen pagina-info: gebruik totaalscore voor alle geselecteerde pagina's
        const pct = data.totaal > 0 ? Math.round((data.score / data.totaal) * 100) : 0;
        geselecteerdePaginaNummers.forEach((p) => { paginaScores[String(p)] = pct; });
      }
      if (Object.keys(paginaScores).length) registreerPaginaScores(hoofdstukId, paginaScores);

      toonNieuweSterren(verdiend);
      setVoortgang(getVoortgang(hoofdstukId));
    }
    if (data.beoordelingen) {
      data.beoordelingen.forEach((b: { correct: boolean }, i: number) => {
        if (b.correct) {
          setTimeout(() => confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } }), i * 300);
        }
      });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 min-h-screen bg-slate-200 py-10 px-8">
      <div className="max-w-2xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <span className="text-purple-400">Oefenen</span>
          <span>/</span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${vak.kleur}`} />
            {vak.naam}
          </span>
          <span>/</span>
          <span className="text-slate-700 font-medium">{hoofdstuk.naam}</span>
        </div>

        {/* ── Nieuw verdiende sterren banner ── */}
        {nieuweSterren.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
              <p className="text-4xl mb-3">
                {nieuweSterren.some((s) => s.niveau === "goud") ? "🏆" : nieuweSterren.some((s) => s.niveau === "zilver") ? "🌟" : "⭐"}
              </p>
              <h2 className="text-xl font-bold text-indigo-900 mb-1">
                {nieuweSterren.length === 1 ? "Nieuwe ster verdiend!" : `${nieuweSterren.length} nieuwe sterren verdiend!`}
              </h2>
              <div className="space-y-3 my-4">
                {nieuweSterren.map((s) => (
                  <div key={s.id} className={`p-3 rounded-xl border text-left ${s.niveau === "goud" ? "bg-yellow-50 border-yellow-200" : s.niveau === "zilver" ? "bg-slate-50 border-slate-200" : "bg-orange-50 border-orange-200"}`}>
                    <p className="font-bold text-sm text-indigo-900">
                      {s.niveau === "goud" ? "🥇" : s.niveau === "zilver" ? "🥈" : "🥉"} {s.naam}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.uitleg}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setNieuweSterren([])}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity"
              >
                Doorgaan 🎉
              </button>
            </div>
          </div>
        )}

        {/* ── Pagina-selectie ── */}
        {mode === "paginakeuze" && (
          <>
            <h1 className="text-4xl font-bold text-indigo-900 mb-2">Oefenen</h1>
            <p className="text-slate-500 mb-5 text-sm">
              Kies welke pagina's je wilt oefenen van <span className="font-semibold text-indigo-700">{hoofdstuk.naam}</span>.
            </p>

            {/* Hoofdstuk-niveau score */}
            {voortgang && voortgang.aantalSessies > 0 && (
              <div className="mb-4 px-4 py-3 bg-white rounded-xl border border-purple-100 shadow-sm flex items-center gap-3">
                <span className="text-2xl">{voortgang.besteOverhoorScore >= 80 ? "🥇" : voortgang.besteOverhoorScore >= 60 ? "🥈" : "🥉"}</span>
                <div>
                  <p className="text-xs font-semibold text-purple-700">Heel hoofdstuk</p>
                  <p className="text-xs text-slate-500">Beste score: <span className="font-bold">{voortgang.besteOverhoorScore}%</span> · {voortgang.aantalSessies} sessie{voortgang.aantalSessies !== 1 ? "s" : ""}</p>
                </div>
              </div>
            )}

            {/* Pagina's grid */}
            {hoofdstuk.samenvattingen.length === 0 ? (
              <p className="text-sm text-slate-400">Geen samenvattingen opgeslagen in dit hoofdstuk.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[...hoofdstuk.samenvattingen]
                    .sort((a, b) => a.paginanummer - b.paginanummer)
                    .map((s) => {
                      const ps = voortgang?.paginaScores?.[String(s.paginanummer)];
                      const geselecteerd = geselecteerdePaginas?.includes(s.paginanummer) ?? false;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setGeselecteerdePaginas((prev) => {
                              if (prev === null) return [s.paginanummer];
                              if (prev.includes(s.paginanummer)) {
                                const nieuw = prev.filter((p) => p !== s.paginanummer);
                                return nieuw.length === 0 ? null : nieuw;
                              }
                              return [...prev, s.paginanummer].sort((a, b) => a - b);
                            });
                          }}
                          className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                            geselecteerd
                              ? "border-purple-500 bg-purple-50 shadow-md"
                              : scoreKleur(ps?.besteScore)
                          }`}
                        >
                          <p className="text-base font-bold text-indigo-900">p.{s.paginanummer}</p>
                          <p className="text-xs mt-0.5">{scoreLabel(ps?.besteScore, ps?.aantalSessies)}</p>
                          {geselecteerd && (
                            <span className="absolute top-1 right-1 text-purple-500 text-xs">✓</span>
                          )}
                        </button>
                      );
                    })}
                </div>

                <div className="flex gap-2 mb-4 text-xs">
                  <button
                    onClick={() => setGeselecteerdePaginas(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-600 transition-colors"
                  >
                    Alles selecteren
                  </button>
                  <button
                    onClick={() => setGeselecteerdePaginas([])}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 transition-colors"
                  >
                    Niets selecteren
                  </button>
                </div>

                {/* Legenda */}
                <div className="flex gap-3 mb-5 text-xs text-slate-400 flex-wrap">
                  <span><span className="inline-block w-2.5 h-2.5 rounded bg-slate-200 mr-1" />Nog niet geoefend</span>
                  <span><span className="inline-block w-2.5 h-2.5 rounded bg-rose-200 mr-1" />Onder 60%</span>
                  <span><span className="inline-block w-2.5 h-2.5 rounded bg-amber-200 mr-1" />60–79%</span>
                  <span><span className="inline-block w-2.5 h-2.5 rounded bg-emerald-200 mr-1" />80%+ ✓</span>
                </div>

                <button
                  onClick={() => setMode("keuze")}
                  disabled={geselecteerdePaginas !== null && geselecteerdePaginas.length === 0}
                  className="w-full max-w-xs py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-xl shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {geselecteerdePaginas === null
                    ? `Heel hoofdstuk oefenen (${hoofdstuk.samenvattingen.length} pagina's)`
                    : `${geselecteerdePaginas.length} pagina${geselecteerdePaginas.length !== 1 ? "'s" : ""} oefenen →`}
                </button>
              </>
            )}
          </>
        )}

        {/* ── Keuze ── */}
        {mode === "keuze" && (
          <>
            <h1 className="text-4xl font-bold text-indigo-900 mb-2">Oefenen</h1>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setMode("paginakeuze")} className="text-xs text-purple-400 hover:text-purple-600">← Pagina's</button>
            </div>
            <p className="text-slate-500 mb-4 text-sm">
              Kies hoe je wilt oefenen{geselecteerdePaginas !== null ? ` — pagina${geselecteerdePaginas.length !== 1 ? "'s" : ""} ${geselecteerdePaginas.join(", ")}` : ` — heel hoofdstuk`}
            </p>

            {/* Sterrenoverzicht */}
            {voortgang && (
              <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Jouw sterren</p>
                  <p className="text-xs text-slate-400 italic">Ga over een ster heen om te zien hoe je deze kunt behalen</p>
                </div>
                {(["brons", "zilver", "goud"] as const).map((niveau) => {
                  const sterrenVanNiveau = STERREN.filter((s) => s.niveau === niveau);
                  const emoji = niveau === "goud" ? "🥇" : niveau === "zilver" ? "🥈" : "🥉";
                  const kleur = niveau === "goud" ? "text-yellow-400" : niveau === "zilver" ? "text-slate-400" : "text-orange-400";
                  const aantalVerdiend = voortgang.verdiendeSterren.filter((id) => sterrenVanNiveau.some((s) => s.id === id)).length;
                  return (
                    <div key={niveau} className="flex items-center gap-4 mb-3 last:mb-0">
                      <span className="text-2xl w-8 shrink-0">{emoji}</span>
                      <div className="flex gap-1.5">
                        {sterrenVanNiveau.map((s) => {
                          const verdiend = voortgang.verdiendeSterren.includes(s.id);
                          return (
                            <span
                              key={s.id}
                              title={verdiend ? `✅ ${s.naam}: ${s.uitleg}` : `🔒 ${s.naam}: ${s.hoeTeVerdienen}`}
                              className={`text-3xl leading-none transition-all cursor-help select-none ${verdiend ? kleur : "opacity-20 text-slate-300"}`}
                            >
                              ★
                            </span>
                          );
                        })}
                      </div>
                      <span className="text-xs text-slate-400 ml-1">{aantalVerdiend}/5</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={`grid gap-4 ${isTaal ? "grid-cols-2" : "grid-cols-1 max-w-sm"}`}>
              {isTaal && (
                <button
                  data-ptour="woorden-knop"
                  onClick={startWoorden}
                  className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-300 transition-all text-left"
                >
                  <span className="text-5xl">📚</span>
                  <div>
                    <p className="font-bold text-indigo-900 text-base">Woorden oefenen</p>
                    <p className="text-xs text-slate-400 mt-1">AI haalt de woorden uit de stof — typ de vertaling</p>
                  </div>
                </button>
              )}

              <button
                data-ptour="overhoren-knop"
                onClick={startOverhoren}
                className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-300 transition-all text-left"
              >
                <span className="text-5xl">🧠</span>
                <div>
                  <p className="font-bold text-indigo-900 text-base">Overhoren</p>
                  <p className="text-xs text-slate-400 mt-1">AI stelt vragen over de stof en beoordeelt jouw antwoorden</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Woorden: laden ── */}
        {mode === "woorden" && woordenStap === "laden" && (
          <div className="flex flex-col items-center py-16 gap-4">
            {woordenLaadFout ? (
              <>
                <p className="text-sm text-rose-500">Geen woorden gevonden in de stof. Sla eerst samenvattingen op met paginatekst.</p>
                <button onClick={() => setMode("keuze")} className="text-xs text-purple-400 hover:text-purple-600">← Terug</button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                <p className="text-sm font-medium text-purple-700">AI zoekt de woorden uit de stof…</p>
              </>
            )}
          </div>
        )}

        {/* ── Woorden: richting kiezen ── */}
        {mode === "woorden" && woordenStap === "richting" && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setMode("keuze")} className="text-xs text-purple-400 hover:text-purple-600">← Terug</button>
              <h1 className="text-2xl font-bold text-indigo-900">Woorden oefenen</h1>

            </div>
            <p className="text-sm text-slate-500 mb-2">
              AI heeft <span className="font-semibold text-indigo-700">{woordparen.length} woorden</span> gevonden. Kies de richting:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setRichting("vreemdNaarNl")}
                className={`p-5 rounded-2xl border text-left transition-all ${richting === "vreemdNaarNl" ? "bg-purple-600 border-purple-600 text-white shadow-md" : "bg-white border-purple-100 text-slate-700 hover:border-purple-300"}`}
              >
                <p className="text-xl mb-1">🌍 → 🇳🇱</p>
                <p className="font-semibold text-sm">Vreemde taal</p>
                <p className={`text-xs mt-0.5 ${richting === "vreemdNaarNl" ? "text-purple-200" : "text-slate-400"}`}>Jij typt de Nederlandse betekenis</p>
              </button>
              <button
                onClick={() => setRichting("nlNaarVreemd")}
                className={`p-5 rounded-2xl border text-left transition-all ${richting === "nlNaarVreemd" ? "bg-purple-600 border-purple-600 text-white shadow-md" : "bg-white border-purple-100 text-slate-700 hover:border-purple-300"}`}
              >
                <p className="text-xl mb-1">🇳🇱 → 🌍</p>
                <p className="font-semibold text-sm">Nederlands</p>
                <p className={`text-xs mt-0.5 ${richting === "nlNaarVreemd" ? "text-purple-200" : "text-slate-400"}`}>Jij typt het woord in de vreemde taal</p>
              </button>
            </div>

            <button
              onClick={startOefenen}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity"
            >
              Starten →
            </button>
          </>
        )}

        {/* ── Woorden: oefenen ── */}
        {mode === "woorden" && woordenStap === "oefenen" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-indigo-900">Woorden oefenen</h1>
              <span className="text-xs text-slate-400">{oefeIndex + 1} / {oefeWoorden.length}</span>
            </div>

            <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-8 mb-4 text-center">
              {/* Het te vertalen woord */}
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest">
                {richting === "vreemdNaarNl" ? "Wat betekent dit?" : "Hoe zeg je dit?"}
              </p>
              <p className="text-4xl font-bold text-indigo-800 mb-6">
                {richting === "vreemdNaarNl" ? oefeWoorden[oefeIndex].vreemd : oefeWoorden[oefeIndex].nederlands}
              </p>

              {/* Invulveld */}
              {!gecontroleerd ? (
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input
                    ref={inputRef}
                    value={typInput}
                    onChange={(e) => setTypInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && typInput.trim() && controleer()}
                    placeholder={richting === "vreemdNaarNl" ? "Nederlandse betekenis…" : "Woord in de vreemde taal…"}
                    className="flex-1 px-4 py-2.5 text-sm bg-purple-50 border border-purple-200 rounded-xl text-purple-900 outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={controleer}
                    disabled={!typInput.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    Check
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {correct ? (
                    <p className="text-emerald-600 font-semibold">✅ Goed!</p>
                  ) : (
                    <div>
                      <p className="text-rose-500 font-semibold">❌ Niet helemaal…</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Het juiste antwoord: <span className="font-bold text-slate-700">
                          {richting === "vreemdNaarNl" ? oefeWoorden[oefeIndex].nederlands : oefeWoorden[oefeIndex].vreemd}
                        </span>
                      </p>
                    </div>
                  )}
                  <button
                    onClick={volgendWoord}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity"
                  >
                    {oefeIndex + 1 < oefeWoorden.length ? "Volgende →" : "Bekijk score"}
                  </button>
                </div>
              )}
            </div>

            {/* Voortgangsbalk */}
            <div className="w-full bg-purple-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-pink-500 h-2 rounded-full transition-all"
                style={{ width: `${(oefeIndex / oefeWoorden.length) * 100}%` }}
              />
            </div>
          </>
        )}

        {/* ── Woorden: klaar ── */}
        {mode === "woorden" && woordenStap === "klaar" && (
          <div className="text-center py-10">
            <div className="text-6xl mb-4">
              {score.goed >= oefeWoorden.length * 0.8 ? "🚀" : score.goed >= oefeWoorden.length * 0.5 ? "😊" : "😬"}
            </div>
            <h2 className="text-2xl font-bold text-indigo-900 mb-2">Klaar!</h2>
            <p className="text-slate-500 mb-6">
              Je had <span className="font-bold text-emerald-600">{score.goed}</span> goed en{" "}
              <span className="font-bold text-rose-500">{score.fout}</span> fout van de {oefeWoorden.length} woorden.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={startOefenen}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity"
              >
                Opnieuw oefenen
              </button>
              <button
                onClick={() => setWoordenStap("richting")}
                className="px-5 py-2.5 border border-purple-200 text-purple-600 text-sm rounded-xl hover:bg-purple-50 transition-colors"
              >
                Andere richting
              </button>
              <button
                onClick={() => setMode("paginakeuze")}
                className="px-5 py-2.5 border border-purple-200 text-purple-600 text-sm rounded-xl hover:bg-purple-50 transition-colors"
              >
                ← Pagina's
              </button>
            </div>
          </div>
        )}

        {/* ── Overhoren: laden ── */}

        {mode === "overhoren" && overhoorStap === "laden" && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
            <p className="text-sm font-medium text-purple-700">AI maakt vragen voor jou…</p>
          </div>
        )}

        {/* ── Overhoren: vragen ── */}
        {mode === "overhoren" && overhoorStap === "vragen" && vragen.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-indigo-900">Overhoren</h1>
              <span className="text-xs text-slate-400">Vraag {huidigVraagIdx + 1} van {vragen.length}</span>
            </div>

            <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 mb-4">
              <p className="text-base font-semibold text-indigo-800 mb-4">{vragen[huidigVraagIdx]}</p>
              <textarea
                value={huidigAntwoord}
                onChange={(e) => setHuidigAntwoord(e.target.value)}
                placeholder="Typ hier je antwoord…"
                rows={3}
                className="w-full px-4 py-3 text-sm bg-purple-50 border border-purple-200 rounded-xl text-purple-900 outline-none focus:border-purple-400 resize-none"
              />
            </div>

            <div className="w-full bg-purple-100 rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-purple-600 to-pink-500 h-2 rounded-full transition-all"
                style={{ width: `${(huidigVraagIdx / vragen.length) * 100}%` }}
              />
            </div>

            <button
              onClick={handleVolgende}
              disabled={!huidigAntwoord.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {huidigVraagIdx + 1 < vragen.length ? "Volgende vraag →" : "Controleer antwoorden ✅"}
            </button>
          </>
        )}

        {/* ── Overhoren: beoordelen ── */}
        {mode === "overhoren" && overhoorStap === "beoordelen" && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
            <p className="text-sm font-medium text-purple-700">AI beoordeelt jouw antwoorden…</p>
          </div>
        )}

        {/* ── Overhoren: resultaat ── */}
        {mode === "overhoren" && overhoorStap === "resultaat" && beoordeling && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-indigo-900">Resultaat</h1>
              <div className="bg-white rounded-xl px-4 py-2 border border-purple-100 shadow-sm text-center">
                <p className="text-xs text-indigo-400">Score</p>
                <p className={`text-2xl font-bold ${beoordeling.score >= beoordeling.totaal * 0.8 ? "text-emerald-600" : beoordeling.score >= beoordeling.totaal * 0.5 ? "text-sky-600" : "text-rose-500"}`}>
                  {beoordeling.score}/{beoordeling.totaal}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {beoordeling.beoordelingen.map((b, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${b.correct ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Vraag {i + 1}</p>
                  <p className="text-sm font-medium text-slate-800 mb-1">{vragen[i]}</p>
                  <p className="text-xs text-slate-500 mb-2">Jouw antwoord: <span className="italic">{antwoorden[i] || "–"}</span></p>
                  <p className={`text-xs font-semibold ${b.correct ? "text-emerald-700" : "text-rose-600"}`}>
                    {b.correct ? "✅" : "❌"} {b.feedback}
                  </p>
                  {!b.correct && b.juistAntwoord && (
                    <p className="text-xs text-slate-500 mt-1">
                      Juist antwoord: <span className="font-medium text-slate-700">{b.juistAntwoord}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-white rounded-2xl border border-purple-100 shadow-sm mb-6">
              <p className="text-sm text-purple-700 font-medium">{beoordeling.slotwoord}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={startOverhoren}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity">
                Opnieuw overhoren
              </button>
              <button onClick={() => setMode("paginakeuze")}
                className="px-5 py-2.5 border border-purple-200 text-purple-600 text-sm rounded-xl hover:bg-purple-50 transition-colors">
                ← Pagina's
              </button>
            </div>
          </>
        )}
      </div>
      <PageTour stappen={[
        { emoji: "🎯", titel: "Oefenen", beschrijving: "Hier oefen je de stof van dit hoofdstuk. Je kunt kiezen tussen woordjes oefenen (bij taalvakken) of jezelf laten overhoren." },
        { target: "woorden-knop", emoji: "📚", titel: "Woorden oefenen", beschrijving: "AI haalt automatisch de vreemde woorden uit je samenvattingen. Jij typt de vertaling — en bij elke goed antwoord krijg je confetti! 🎉" },
        { target: "overhoren-knop", emoji: "🧠", titel: "Overhoren", beschrijving: "AI stelt 5 vragen over de stof en beoordeelt jouw antwoorden. Je krijgt een score en feedback per vraag. Verdien sterren als je goed scoort!" },
      ]} />
    </main>
  );
}
