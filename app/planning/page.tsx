"use client";

import { useState, useEffect } from "react";
import PageTour from "../components/PageTour";
import { addLog } from "../lib/log";
import {
  getToetsmomenten, addToetsmoment, deleteToetsmoment,
  getPlan, savePlan, markeerTaakVoltooid,
  type Toetsmoment, type Studieplan, type PlanDag,
} from "../lib/planning";
import { getVakken, type Vak } from "../lib/store";

const vandaag = new Date().toISOString().split("T")[0];

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

function dagLabel(datum: string): string {
  const d = new Date(datum + "T12:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

function dagenTot(datum: string): number {
  return Math.ceil((new Date(datum).getTime() - new Date(vandaag).getTime()) / (1000 * 60 * 60 * 24));
}

function typeKleur(type: string) {
  if (type === "overhoren") return "bg-rose-50 border-rose-200 text-rose-700";
  if (type === "herhalen") return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-indigo-50 border-indigo-200 text-indigo-700";
}

function typeEmoji(type: string) {
  if (type === "overhoren") return "🧠";
  if (type === "herhalen") return "🔁";
  return "📖";
}

export default function PlanningPage() {
  const [vakken, setVakken] = useState<Vak[]>([]);
  const [toetsmomenten, setToetsmomenten] = useState<Toetsmoment[]>([]);
  const [plannen, setPlannen] = useState<Record<string, Studieplan>>({});
  const [geselecteerdeToets, setGeselecteerdeToets] = useState<string | null>(null);
  const [geselecteerdeDag, setGeselecteerdeDag] = useState<string | null>(null);

  // Toets toevoegen
  const [toonFormulier, setToonFormulier] = useState(false);
  const [formulier, setFormulier] = useState({ vakId: "", datum: "", hoofdstukIds: [] as string[] });

  // Plan genereren
  const [genererenden, setGenererenden] = useState<string | null>(null); // toetsmomentId
  const [toonAlleDagen, setToonAlleDagen] = useState(false);

  // Mini-quiz (dagelijkse check)
  type QuizModus = "woorden" | "overhoren";
  type Woordpaar = { vreemd: string; nederlands: string };

  const [quizActief, setQuizActief] = useState(false);
  const [quizModus, setQuizModus] = useState<QuizModus>("overhoren");
  const [quizLaden, setQuizLaden] = useState(false);
  const [quizTaakIndex, setQuizTaakIndex] = useState<number | null>(null);


  // Overhoren state
  const [quizVragen, setQuizVragen] = useState<string[]>([]);
  const [quizAntwoorden, setQuizAntwoorden] = useState<string[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizInput, setQuizInput] = useState("");
  const [quizResultaat, setQuizResultaat] = useState<{ feedback: string; correct: boolean }[] | null>(null);

  // Woordjes state
  const [woordparen, setWoordparen] = useState<Woordpaar[]>([]);
  const [woordIdx, setWoordIdx] = useState(0);
  const [woordInput, setWoordInput] = useState("");
  const [woordGecontroleerd, setWoordGecontroleerd] = useState(false);
  const [woordCorrect, setWoordCorrect] = useState(false);
  const [woordScore, setWoordScore] = useState({ goed: 0, fout: 0 });
  const [woordKlaar, setWoordKlaar] = useState(false);

  function laadAlles() {
    const v = getVakken();
    setVakken(v);
    const t = getToetsmomenten().filter((t) => t.datum >= vandaag).sort((a, b) => a.datum.localeCompare(b.datum));
    setToetsmomenten(t);
    const p: Record<string, Studieplan> = {};
    t.forEach((tm) => {
      const plan = getPlan(tm.id);
      if (plan) p[tm.id] = plan;
    });
    setPlannen(p);
  }

  useEffect(() => {
    laadAlles();
    window.addEventListener("planning-updated", laadAlles);
    window.addEventListener("vakken-updated", laadAlles);
    return () => {
      window.removeEventListener("planning-updated", laadAlles);
      window.removeEventListener("vakken-updated", laadAlles);
    };
  }, []);

  const geselecteerdVak = vakken.find((v) => v.id === formulier.vakId);

  async function genereerPlan(tm: Toetsmoment) {
    const vak = vakken.find((v) => v.id === tm.vakId);
    if (!vak) return;
    setGenererenden(tm.id);

    const hoofdstukken = vak.hoofdstukken
      .filter((h) => tm.hoofdstukIds.includes(h.id))
      .map((h) => ({ naam: h.naam, aantalSamenvattingen: h.samenvattingen.length }));

    const res = await fetch("/api/planning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vakNaam: tm.vakNaam, toetsDatum: tm.datum, vandaag, hoofdstukken }),
    });
    const data = await res.json();
    if (data.dagen) {
      const plan: Studieplan = {
        id: crypto.randomUUID(),
        toetsmomentId: tm.id,
        vakNaam: tm.vakNaam,
        toetsDatum: tm.datum,
        aangemaakt: new Date().toISOString(),
        dagen: data.dagen.map((d: PlanDag) => ({
          ...d,
          taken: d.taken.map((t) => ({ ...t, voltooid: false })),
        })),
      };
      savePlan(plan);
      addLog(`Studieplan gegenereerd — ${tm.vakNaam}, toets op ${tm.datum}`);
      laadAlles();
    }
    setGenererenden(null);
  }

  function handleToetsSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formulier.vakId || !formulier.datum || formulier.hoofdstukIds.length === 0) return;
    const vak = vakken.find((v) => v.id === formulier.vakId)!;
    addToetsmoment(vak.naam, vak.id, formulier.datum, formulier.hoofdstukIds);
    addLog(`Toets ingepland — ${vak.naam} op ${formulier.datum}`);
    setFormulier({ vakId: "", datum: "", hoofdstukIds: [] });
    setToonFormulier(false);
    laadAlles();
  }

  async function startDagQuiz(plan: Studieplan, dag: PlanDag, taakIndex: number) {
    const taak = dag.taken[taakIndex];
    const vak = vakken.find((v) => v.naam === plan.vakNaam);
    if (!vak) return;

    const stof = vak.hoofdstukken
      .filter((h) => taak.hoofdstukNamen.includes(h.naam))
      .flatMap((h) => h.samenvattingen)
      .map((s) => s.inhoud)
      .join("\n\n");

    // Reset alle state
    setQuizLaden(true);
    setQuizActief(true);
    setQuizVragen([]);
    setQuizAntwoorden([]);
    setQuizIdx(0);
    setQuizInput("");
    setQuizResultaat(null);
    setQuizTaakIndex(taakIndex);

    setWoordparen([]);
    setWoordIdx(0);
    setWoordInput("");
    setWoordGecontroleerd(false);
    setWoordCorrect(false);
    setWoordScore({ goed: 0, fout: 0 });
    setWoordKlaar(false);

    if (isTaalVak(vak.naam)) {
      setQuizModus("woorden");
      const alleTekst = vak.hoofdstukken
        .filter((h) => taak.hoofdstukNamen.includes(h.naam))
        .flatMap((h) => h.samenvattingen)
        .map((s) => (s.volledigeTekst ?? "") + " " + s.inhoud)
        .join("\n\n");
      const res = await fetch("/api/woordparen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tekst: alleTekst }),
      });
      const data = await res.json();
      const paren: Woordpaar[] = (data.paren ?? []).slice(0, 8);
      setWoordparen(paren);
      setQuizLaden(false);
    } else {
      setQuizModus("overhoren");
      const res = await fetch("/api/overhoren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stof }),
      });
      const data = await res.json();
      const vragen: string[] = (data.vragen ?? []).slice(0, 3);
      setQuizVragen(vragen);
      setQuizAntwoorden(new Array(vragen.length).fill(""));
      setQuizLaden(false);
    }
  }

  function controleerWoord() {
    const huidig = woordparen[woordIdx];
    const goed = normaliseer(woordInput) === normaliseer(huidig.nederlands);
    setWoordCorrect(goed);
    setWoordGecontroleerd(true);
    setWoordScore((s) => ({ goed: s.goed + (goed ? 1 : 0), fout: s.fout + (goed ? 0 : 1) }));
  }

  function volgendWoord() {
    if (woordIdx + 1 >= woordparen.length) {
      setWoordKlaar(true);
      // woordScore is al bijgewerkt door controleerWoord, gebruik de huidige waarde
      const totaal = woordparen.length;
      if (woordScore.goed >= Math.ceil(totaal * 0.6)) {
        const plan = plannen[geselecteerdeToets!];
        if (plan) {
          markeerTaakVoltooid(plan.id, geselecteerdeDag!, quizTaakIndex!);
          addLog(`Studietaak voltooid (woordjes) — ${plan.vakNaam}, ${geselecteerdeDag}: ${woordScore.goed}/${totaal} goed`);
          laadAlles();
        }
      }
    } else {
      setWoordIdx((i) => i + 1);
      setWoordInput("");
      setWoordGecontroleerd(false);
      setWoordCorrect(false);
    }
  }

  async function stuurQuizAntwoord() {
    const bijgewerkt = [...quizAntwoorden];
    bijgewerkt[quizIdx] = quizInput;
    setQuizAntwoorden(bijgewerkt);

    if (quizIdx + 1 < quizVragen.length) {
      setQuizIdx(quizIdx + 1);
      setQuizInput(bijgewerkt[quizIdx + 1] ?? "");
      return;
    }

    // Laatste vraag — beoordeel alles
    setQuizLaden(true);
    const vak = vakken.find((v) => v.naam === plannen[geselecteerdeToets!]?.vakNaam);
    const dag = plannen[geselecteerdeToets!]?.dagen.find((d) => d.datum === geselecteerdeDag);
    const taak = dag?.taken[quizTaakIndex!];
    const stof = vak?.hoofdstukken
      .filter((h) => taak?.hoofdstukNamen.includes(h.naam))
      .flatMap((h) => h.samenvattingen)
      .map((s) => s.inhoud)
      .join("\n\n") ?? "";

    const payload = quizVragen.map((v, i) => ({ vraag: v, antwoord: bijgewerkt[i] ?? "" }));
    const res = await fetch("/api/overhoren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stof, antwoorden: payload }),
    });
    const data = await res.json();
    setQuizResultaat(data.beoordelingen ?? []);
    setQuizLaden(false);

    // Markeer taak als voltooid als score >= 60%
    if (data.score >= Math.ceil(quizVragen.length * 0.6)) {
      const plan = plannen[geselecteerdeToets!];
      markeerTaakVoltooid(plan.id, geselecteerdeDag!, quizTaakIndex!);
      addLog(`Studietaak voltooid (overhoren) — ${plan.vakNaam}, ${geselecteerdeDag}: ${data.score}/${quizVragen.length} goed`);
      laadAlles();
    }
  }

  const activePlan = geselecteerdeToets ? plannen[geselecteerdeToets] : null;
  const activeDag = activePlan?.dagen.find((d) => d.datum === geselecteerdeDag) ?? null;

  // Alle taken van vandaag over alle plannen heen
  type VandaagTaak = {
    planId: string;
    toetsmomentId: string;
    vakNaam: string;
    dagDatum: string;
    taakIndex: number;
    type: string;
    hoofdstukNamen: string[];
    omschrijving: string;
    voltooid: boolean;
  };

  const vandaagTaken: VandaagTaak[] = Object.values(plannen).flatMap((plan) => {
    const dag = plan.dagen.find((d) => d.datum === vandaag);
    if (!dag) return [];
    return dag.taken.map((taak, i) => ({
      planId: plan.id,
      toetsmomentId: plan.toetsmomentId,
      vakNaam: plan.vakNaam,
      dagDatum: vandaag,
      taakIndex: i,
      type: taak.type,
      hoofdstukNamen: taak.hoofdstukNamen,
      omschrijving: taak.omschrijving,
      voltooid: taak.voltooid,
    }));
  });

  return (
    <main className="flex-1 min-h-screen bg-slate-200 py-10 px-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-indigo-900 mb-1">Planning</h1>
            <p className="text-indigo-500 text-sm">AI maakt een studieplan op basis van jouw toetsdatums 📅</p>
          </div>
          <button
            data-ptour="toets-toevoegen"
            onClick={() => setToonFormulier((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Toets toevoegen
          </button>
        </div>

        {/* Toets toevoegen formulier */}
        {toonFormulier && (
          <form onSubmit={handleToetsSubmit} className="mb-8 p-5 bg-white rounded-2xl border border-purple-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-purple-700">📅 Nieuwe toets inplannen</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-purple-400">Vak</label>
                <select value={formulier.vakId} onChange={(e) => setFormulier((f) => ({ ...f, vakId: e.target.value, hoofdstukIds: [] }))}
                  className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400" required>
                  <option value="">Kies vak…</option>
                  {vakken.map((v) => <option key={v.id} value={v.id}>{v.naam}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-purple-400">Toetsdatum</label>
                <input type="date" min={vandaag} value={formulier.datum}
                  onChange={(e) => setFormulier((f) => ({ ...f, datum: e.target.value }))}
                  className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400" required />
              </div>
            </div>
            {geselecteerdVak && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-purple-400">Welke hoofdstukken komen op de toets?</label>
                {geselecteerdVak.hoofdstukken.length === 0 ? (
                  <p className="text-xs text-purple-300 italic">Geen hoofdstukken gevonden voor dit vak.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {geselecteerdVak.hoofdstukken.map((h) => {
                      const geselecteerd = formulier.hoofdstukIds.includes(h.id);
                      return (
                        <button type="button" key={h.id}
                          onClick={() => setFormulier((f) => ({
                            ...f,
                            hoofdstukIds: geselecteerd ? f.hoofdstukIds.filter((id) => id !== h.id) : [...f.hoofdstukIds, h.id]
                          }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${geselecteerd ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"}`}
                        >
                          {h.naam} ({h.samenvattingen.length} p.)
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={!formulier.vakId || !formulier.datum || formulier.hoofdstukIds.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-lg shadow-md hover:opacity-90 disabled:opacity-40 transition-opacity">
                Opslaan
              </button>
              <button type="button" onClick={() => setToonFormulier(false)}
                className="px-4 py-2 border border-purple-200 text-purple-500 text-sm rounded-lg hover:bg-purple-50">
                Annuleren
              </button>
            </div>
          </form>
        )}

        {/* ── Dagoverzicht vandaag ── */}
        {vandaagTaken.length > 0 && (
          <div data-ptour="vandaag-taken" className="mb-8">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="text-base">📍</span> Vandaag te doen
            </p>
            <div className="space-y-2">
              {vandaagTaken.map((taak) => {
                const plan = plannen[taak.toetsmomentId];
                return (
                  <div key={`${taak.planId}-${taak.taakIndex}`}
                    className={`flex items-start gap-4 p-4 bg-white rounded-2xl border shadow-sm transition-all ${taak.voltooid ? "border-emerald-200 bg-emerald-50" : "border-purple-100"}`}
                  >
                    {/* Status */}
                    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 border-2 ${taak.voltooid ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                      {taak.voltooid && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Inhoud */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-purple-700">{taak.vakNaam}</span>
                        <span className="text-xs text-slate-400">{typeEmoji(taak.type)} {taak.type}</span>
                      </div>
                      <p className={`text-sm font-semibold text-slate-800 ${taak.voltooid ? "line-through text-slate-400" : ""}`}>
                        {taak.hoofdstukNamen.join(", ")}
                      </p>
                      <p className={`text-xs mt-0.5 leading-relaxed ${taak.voltooid ? "line-through text-slate-300" : "text-slate-500"}`}>
                        {taak.omschrijving}
                      </p>
                    </div>

                    {/* Actie */}
                    {!taak.voltooid && plan && (
                      <button
                        onClick={() => {
                          const dag = plan.dagen.find((d) => d.datum === vandaag)!;
                          setGeselecteerdeToets(taak.toetsmomentId);
                          setGeselecteerdeDag(vandaag);
                          startDagQuiz(plan, dag, taak.taakIndex);
                        }}
                        className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:opacity-90 transition-opacity"
                      >
                        🎯 Check
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {vandaagTaken.every((t) => t.voltooid) && (
              <div className="mt-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                <p className="text-sm font-bold text-emerald-700">🎉 Alles gedaan voor vandaag! Goed bezig!</p>
              </div>
            )}
          </div>
        )}

        {toetsmomenten.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-lg font-semibold text-purple-700 mb-1">Nog geen toetsen ingepland</p>
            <p className="text-sm text-purple-300 mb-4">Voeg je eerste toets toe en AI maakt een studieplan voor je!</p>
            <button onClick={() => setToonFormulier(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity">
              + Toets toevoegen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">

            {/* Kolom 1: Toetsen */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest px-1">Toetsen</p>
              {toetsmomenten.map((tm) => {
                const dagen = dagenTot(tm.datum);
                const heeftPlan = !!plannen[tm.id];
                const actief = geselecteerdeToets === tm.id;
                return (
                  <div key={tm.id}
                    className={`p-4 bg-white rounded-2xl border shadow-sm cursor-pointer transition-all ${actief ? "border-purple-400 shadow-md" : "border-purple-100 hover:border-purple-200"}`}
                    onClick={() => { setGeselecteerdeToets(tm.id); setGeselecteerdeDag(null); }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-indigo-900">{tm.vakNaam}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(tm.datum + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${dagen <= 2 ? "bg-rose-100 text-rose-600" : dagen <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {dagen === 0 ? "vandaag" : dagen === 1 ? "morgen" : `${dagen}d`}
                      </span>
                    </div>
                    {!heeftPlan ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); genereerPlan(tm); }}
                        disabled={genererenden === tm.id}
                        className="mt-3 w-full py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
                      >
                        {genererenden === tm.id ? "Plan maken…" : "✨ Genereer plan"}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); genereerPlan(tm); }}
                        className="mt-2 text-xs text-purple-400 hover:text-purple-600 transition-colors"
                      >
                        ↻ Nieuw plan maken
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteToetsmoment(tm.id); if (geselecteerdeToets === tm.id) setGeselecteerdeToets(null); laadAlles(); }}
                      className="mt-1 text-xs text-slate-300 hover:text-rose-400 transition-colors"
                    >
                      Verwijderen
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Kolom 2: Dagen van het plan */}
            <div className="space-y-3">
              {activePlan ? (
                <>
                  <div className="flex items-center justify-between px-1 mb-1">
                    <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest">
                      Studiedagen — {activePlan.vakNaam}
                    </p>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={toonAlleDagen}
                        onChange={(e) => setToonAlleDagen(e.target.checked)}
                        className="accent-purple-600 w-3 h-3"
                      />
                      <span className="text-xs text-slate-400">Toon alles</span>
                    </label>
                  </div>
                  {activePlan.dagen.filter((dag) => {
                    if (toonAlleDagen) return true;
                    const diff = Math.ceil((new Date(dag.datum).getTime() - new Date(vandaag).getTime()) / (1000 * 60 * 60 * 24));
                    return diff >= 0 && diff <= 3;
                  }).map((dag) => {
                    const isVandaag = dag.datum === vandaag;
                    const isVerleden = dag.datum < vandaag;
                    const alleVoltooid = dag.taken.every((t) => t.voltooid);
                    const actief = geselecteerdeDag === dag.datum;
                    return (
                      <div key={dag.datum}
                        onClick={() => setGeselecteerdeDag(dag.datum)}
                        className={`p-3 bg-white rounded-xl border shadow-sm cursor-pointer transition-all ${actief ? "border-purple-400 shadow-md" : "border-purple-100 hover:border-purple-200"} ${isVerleden && !alleVoltooid ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-xs font-bold ${isVandaag ? "text-purple-600" : "text-slate-600"}`}>
                              {isVandaag ? "📍 Vandaag" : dagLabel(dag.datum)}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{dag.taken.length} taak{dag.taken.length !== 1 ? "en" : ""}</p>
                          </div>
                          {alleVoltooid ? (
                            <span className="text-emerald-500 text-lg">✅</span>
                          ) : isVerleden ? (
                            <span className="text-rose-400 text-xs font-bold">gemist</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : geselecteerdeToets ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <p>Nog geen plan gegenereerd.</p>
                  <p className="text-xs mt-1">Klik "Genereer plan" bij de toets.</p>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <p>Klik op een toets om het plan te zien.</p>
                </div>
              )}
            </div>

            {/* Kolom 3: Taken van de dag */}
            <div className="space-y-3">
              {activeDag ? (
                <>
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest px-1">
                    {geselecteerdeDag === vandaag ? "Vandaag te doen" : dagLabel(geselecteerdeDag!)}
                  </p>
                  {activeDag.taken.map((taak, i) => (
                    <div key={i} className={`p-4 rounded-2xl border shadow-sm transition-all ${taak.voltooid ? "bg-emerald-50 border-emerald-200" : `bg-white ${typeKleur(taak.type)}`}`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-lg">{typeEmoji(taak.type)}</span>
                        <div className="flex-1">
                          <p className={`text-xs font-bold uppercase tracking-wide ${taak.voltooid ? "text-emerald-600" : "opacity-70"}`}>
                            {taak.voltooid ? "✅ voltooid" : taak.type}
                          </p>
                          <p className={`text-xs font-semibold mt-0.5 ${taak.voltooid ? "line-through text-slate-400" : ""}`}>
                            {taak.hoofdstukNamen.join(", ")}
                          </p>
                        </div>
                      </div>
                      <p className={`text-xs leading-relaxed ${taak.voltooid ? "line-through text-slate-300" : "opacity-80"}`}>
                        {taak.omschrijving}
                      </p>
                      {!taak.voltooid && activePlan && (
                        <button
                          onClick={() => startDagQuiz(activePlan, activeDag, i)}
                          className="mt-3 w-full py-1.5 text-xs font-semibold rounded-lg bg-white border border-current hover:bg-white/80 transition-colors"
                        >
                          🎯 Ik ben klaar — controleer of ik het weet
                        </button>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <p>Klik op een dag om de taken te zien.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mini-quiz modal */}
        {quizActief && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full">
              {quizLaden ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                  <p className="text-sm font-medium text-purple-700">Woordjes ophalen…</p>
                </div>

              ) : quizModus === "woorden" ? (
                /* ── Woordjes modus ── */
                woordparen.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="text-5xl">📚</div>
                    <p className="text-sm font-semibold text-slate-700 text-center">Geen woordjes gevonden</p>
                    <p className="text-xs text-slate-400 text-center">
                      Zorg dat je samenvattingen hebt opgeslagen voor dit hoofdstuk.
                    </p>
                    <button onClick={() => setQuizActief(false)}
                      className="mt-2 w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                      Sluiten
                    </button>
                  </div>
                ) : woordKlaar ? (
                  <>
                    <h2 className="text-lg font-bold text-indigo-900 mb-2">Woordjes klaar!</h2>
                    <p className="text-sm text-slate-500 mb-4">
                      {woordScore.goed} van de {woordparen.length} goed
                    </p>
                    {woordScore.goed >= Math.ceil(woordparen.length * 0.6) ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm text-emerald-700 font-semibold mb-4">
                        🎉 Goed gedaan! Deze taak is als voltooid gemarkeerd.
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-700 mb-4">
                        💪 Nog niet genoeg goed. Oefen nog even en probeer opnieuw.
                      </div>
                    )}
                    <button onClick={() => setQuizActief(false)}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                      Sluiten
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-lg font-bold text-indigo-900">Woordjes oefenen</h2>
                      <span className="text-xs text-slate-400">{woordIdx + 1} / {woordparen.length}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Wat is de Nederlandse vertaling van:</p>
                    <p className="text-2xl font-bold text-indigo-800 mb-5">{woordparen[woordIdx]?.vreemd}</p>

                    {woordGecontroleerd ? (
                      <>
                        <div className={`p-3 rounded-xl border mb-4 text-sm font-semibold ${woordCorrect ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-600"}`}>
                          {woordCorrect ? "✅ Goed!" : `❌ Het juiste antwoord: ${woordparen[woordIdx]?.nederlands}`}
                        </div>
                        <button onClick={volgendWoord}
                          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                          {woordIdx + 1 < woordparen.length ? "Volgende →" : "Klaar ✅"}
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          value={woordInput}
                          onChange={(e) => setWoordInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && woordInput.trim() && controleerWoord()}
                          placeholder="Typ de vertaling…"
                          autoFocus
                          className="w-full px-4 py-3 text-sm bg-purple-50 border border-purple-200 rounded-xl text-purple-900 outline-none focus:border-purple-400 mb-4"
                        />
                        <button onClick={controleerWoord} disabled={!woordInput.trim()}
                          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity">
                          Controleer
                        </button>
                      </>
                    )}
                  </>
                )

              ) : (
                /* ── Overhoren modus ── */
                quizResultaat ? (
                  <>
                    <h2 className="text-lg font-bold text-indigo-900 mb-4">Resultaat</h2>
                    <div className="space-y-3 mb-5">
                      {quizResultaat.map((r, i) => (
                        <div key={i} className={`p-3 rounded-xl border text-sm ${r.correct ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                          <p className="text-xs text-slate-500 mb-0.5">{quizVragen[i]}</p>
                          <p className={`font-semibold text-xs ${r.correct ? "text-emerald-700" : "text-rose-600"}`}>
                            {r.correct ? "✅" : "❌"} {r.feedback}
                          </p>
                        </div>
                      ))}
                    </div>
                    {quizResultaat.filter((r) => r.correct).length >= Math.ceil(quizVragen.length * 0.6) ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm text-emerald-700 font-semibold mb-4">
                        🎉 Goed gedaan! Deze taak is als voltooid gemarkeerd.
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-700 mb-4">
                        💪 Nog niet helemaal. Bestudeer de stof nog even en probeer opnieuw.
                      </div>
                    )}
                    <button onClick={() => setQuizActief(false)}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                      Sluiten
                    </button>
                  </>
                ) : quizVragen.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="text-5xl">📚</div>
                    <p className="text-sm font-semibold text-slate-700 text-center">Geen vragen beschikbaar</p>
                    <p className="text-xs text-slate-400 text-center">
                      Zorg dat je samenvattingen hebt opgeslagen voor dit hoofdstuk, dan kan AI je vragen stellen.
                    </p>
                    <button onClick={() => setQuizActief(false)}
                      className="mt-2 w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                      Sluiten
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-indigo-900">Weet je het nog?</h2>
                      <span className="text-xs text-slate-400">Vraag {quizIdx + 1}/{quizVragen.length}</span>
                    </div>
                    <p className="text-sm font-semibold text-indigo-800 mb-3">{quizVragen[quizIdx]}</p>
                    <textarea
                      value={quizInput}
                      onChange={(e) => setQuizInput(e.target.value)}
                      placeholder="Jouw antwoord…"
                      rows={3}
                      className="w-full px-4 py-3 text-sm bg-purple-50 border border-purple-200 rounded-xl text-purple-900 outline-none focus:border-purple-400 resize-none mb-4"
                    />
                    <button
                      onClick={stuurQuizAntwoord}
                      disabled={!quizInput.trim()}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      {quizIdx + 1 < quizVragen.length ? "Volgende →" : "Controleer ✅"}
                    </button>
                  </>
                )
              )}
            </div>
          </div>
        )}

      </div>
      <PageTour stappen={[
        { emoji: "📅", titel: "Planning", beschrijving: "Hier maak je een studieplan voor je toetsen. Voer je toetsdatum in en AI maakt automatisch een dag-voor-dag plan — leren, herhalen en overhoren." },
        { target: "toets-toevoegen", emoji: "➕", titel: "Toets inplannen", beschrijving: "Klik hier om een toets toe te voegen. Kies het vak, de datum en welke hoofdstukken op de toets komen. AI maakt dan een plan voor je." },
        { target: "vandaag-taken", emoji: "📍", titel: "Vandaag te doen", beschrijving: "Hier zie je wat je vandaag moet doen. Klik op '🎯 Check' als je klaar bent — AI stelt je dan een paar vragen om te controleren of je het echt weet." },
        { emoji: "🗓️", titel: "Studiedagen", beschrijving: "Links zie je de toetsen, in het midden de studiedagen van het plan, rechts de taken per dag. Klik op een dag om de details te zien." },
      ]} />
    </main>
  );
}
