"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { getCijfers, addCijfer, getVakken, type Cijfer } from "../lib/store";
import PageTour from "../components/PageTour";
import { addLog } from "../lib/log";


function cijferKleur(c: number): string {
  if (c >= 8) return "text-emerald-600";
  if (c >= 5.5) return "text-sky-600";
  return "text-rose-500";
}

function cijferEmoji(c: number): string {
  if (c > 7.5) return "🚀";
  if (c >= 5.5) return "😊";
  return "😬";
}

const vandaag = new Date().toISOString().split("T")[0];

export default function CijfersPage() {
  const [cijfers, setCijfers] = useState<Cijfer[]>([]);
  const [vakNamen, setVakNamen] = useState<string[]>([]);
  const [formulier, setFormulier] = useState({ vakNaam: "", toets: "", cijfer: "", datum: vandaag, weging: "1" });
  const [toonFormulier, setToonFormulier] = useState(false);

  function load() {
    const alle = getCijfers();
    setCijfers(alle);
    const vakkenNamen = getVakken().map((v) => v.naam);
    const extraNamen = alle.map((c) => c.vakNaam);
    setVakNamen([...new Set([...vakkenNamen, ...extraNamen])].sort());
  }

  useEffect(() => {
    load();
    window.addEventListener("cijfers-updated", load);
    window.addEventListener("vakken-updated", load);
    return () => {
      window.removeEventListener("cijfers-updated", load);
      window.removeEventListener("vakken-updated", load);
    };
  }, []);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const cijferGetal = parseFloat(formulier.cijfer.replace(",", "."));
    const datum = formulier.datum || vandaag;
    if (!formulier.vakNaam.trim() || !formulier.toets.trim() || isNaN(cijferGetal)) return;
    if (cijferGetal < 1 || cijferGetal > 10) return;
    addCijfer(formulier.vakNaam.trim(), formulier.toets.trim(), cijferGetal, datum, parseInt(formulier.weging));
    addLog(`Cijfer toegevoegd — ${formulier.vakNaam.trim()}: ${formulier.toets.trim()} → ${cijferGetal} (weging ${formulier.weging}×)`);
    setFormulier({ vakNaam: "", toets: "", cijfer: "", datum: vandaag, weging: "1" });
    setToonFormulier(false);

    if (cijferGetal > 7) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { x: 0.1, y: 0.5 }, angle: 60 }), 200);
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { x: 0.9, y: 0.5 }, angle: 120 }), 200);
    }
  }

  // Vakken die cijfers hebben, met gemiddelde
  const perVak = [...new Set(cijfers.map((c) => c.vakNaam))].sort().map((naam) => {
    const vakCijfers = cijfers.filter((c) => c.vakNaam === naam);
    const totalePunten = vakCijfers.reduce((a, c) => a + c.cijfer * (c.weging ?? 1), 0);
    const totaleWeging = vakCijfers.reduce((a, c) => a + (c.weging ?? 1), 0);
    const gemGetal = totaleWeging > 0 ? totalePunten / totaleWeging : 0;
    return { naam, gem: gemGetal > 0 ? gemGetal.toFixed(1) : "–", aantal: vakCijfers.length, gemGetal };
  });

  return (
    <main className="flex-1 min-h-screen bg-slate-200 py-10 px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-indigo-900 mb-1">Mijn cijfers</h1>
            <p className="text-indigo-500 text-sm">Houd je toetscijfers bij per vak 📊</p>
          </div>
          <button
            data-ptour="cijfer-toevoegen"
            onClick={() => setToonFormulier((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-200 hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Cijfer toevoegen
          </button>
        </div>

        {/* Invoerformulier */}
        {toonFormulier && (
          <form onSubmit={handleSubmit} className="mb-8 p-5 bg-white rounded-2xl border border-purple-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-purple-700">✏️ Nieuw cijfer invoeren</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-purple-400">Vak</label>
                <input list="vakken-lijst" value={formulier.vakNaam} onChange={(e) => setFormulier((f) => ({ ...f, vakNaam: e.target.value }))} placeholder="bijv. Biologie" required className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400" />
                <datalist id="vakken-lijst">{vakNamen.map((n) => <option key={n} value={n} />)}</datalist>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-purple-400">Toets / Opdracht</label>
                <input value={formulier.toets} onChange={(e) => setFormulier((f) => ({ ...f, toets: e.target.value }))} placeholder="bijv. Hoofdstuk 3 toets" required className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-purple-400">Cijfer (1–10)</label>
                <input value={formulier.cijfer} onChange={(e) => setFormulier((f) => ({ ...f, cijfer: e.target.value }))} placeholder="bijv. 7.5" required className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-purple-400">Datum</label>
                <input type="date" value={formulier.datum} onChange={(e) => setFormulier((f) => ({ ...f, datum: e.target.value }))} required className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-purple-400">Telt mee</label>
                <select value={formulier.weging} onChange={(e) => setFormulier((f) => ({ ...f, weging: e.target.value }))} className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400">
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}×</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-lg shadow-md shadow-purple-200 hover:opacity-90 transition-opacity">Opslaan</button>
              <button type="button" onClick={() => setToonFormulier(false)} className="px-4 py-2 border border-purple-200 text-purple-500 text-sm rounded-lg hover:bg-purple-50 transition-colors">Annuleren</button>
            </div>
          </form>
        )}

        {/* Overzicht vakken */}
        {perVak.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-lg font-semibold text-purple-700 mb-1">Nog geen cijfers</p>
            <p className="text-sm text-purple-300 mb-4">Voeg je eerste toetscijfer toe om te beginnen!</p>
            <button onClick={() => setToonFormulier(true)} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-200 hover:opacity-90 transition-opacity">
              + Cijfer toevoegen
            </button>
          </div>
        ) : (
          <div data-ptour="vakken-lijst" className="space-y-3">
            {perVak.map(({ naam, gem, aantal, gemGetal }) => (
              <Link key={naam} href={`/cijfers/${encodeURIComponent(naam)}`}
                className="flex items-center justify-between p-5 bg-white rounded-2xl border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cijferEmoji(gemGetal)}</span>
                  <div>
                    <p className="text-sm font-bold text-purple-900">{naam}</p>
                    <p className="text-xs text-purple-300 mt-0.5">{aantal} toets{aantal !== 1 ? "en" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${cijferKleur(gemGetal)}`}>{gem}</span>
                  <svg className="w-4 h-4 text-purple-300 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <PageTour stappen={[
        { emoji: "📊", titel: "Mijn cijfers", beschrijving: "Hier houd je al je toetscijfers bij. Per vak zie je het gewogen gemiddelde en of je trend omhoog of omlaag gaat." },
        { target: "cijfer-toevoegen", emoji: "➕", titel: "Cijfer toevoegen", beschrijving: "Klik hier om een nieuw toetscijfer in te voeren. Je kunt ook aangeven hoe zwaar het cijfer meetelt — een proefwerk van 2× telt dubbel." },
        { target: "vakken-lijst", emoji: "📈", titel: "Vakken overzicht", beschrijving: "Klik op een vak om alle cijfers te zien, inclusief een trendlijn. Zo zie je in één oogopslag of het beter of slechter gaat." },
      ]} />
    </main>
  );
}
