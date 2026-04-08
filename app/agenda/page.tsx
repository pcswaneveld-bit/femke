"use client";

import { useState, useEffect } from "react";
import { getHuiswerk, addHuiswerk, toggleHuiswerk, deleteHuiswerk, type HuiswerkItem } from "../lib/huiswerk";
import { getToetsmomenten, getPlan, type Toetsmoment } from "../lib/planning";
import PageTour from "../components/PageTour";
import { addLog } from "../lib/log";

const vandaag = new Date().toISOString().split("T")[0];

function deadlineBadge(datum: string, afgerond: boolean) {
  if (afgerond) return { label: "Afgerond", kleur: "bg-emerald-100 text-emerald-700" };
  if (datum < vandaag) return { label: "Te laat", kleur: "bg-rose-100 text-rose-600" };
  if (datum === vandaag) return { label: "Vandaag", kleur: "bg-amber-100 text-amber-700" };
  const diff = Math.ceil((new Date(datum).getTime() - new Date(vandaag).getTime()) / 864e5);
  if (diff === 1) return { label: "Morgen", kleur: "bg-orange-100 text-orange-600" };
  return { label: `Over ${diff} dagen`, kleur: "bg-purple-100 text-purple-600" };
}

function toetsBadge(datum: string) {
  if (datum < vandaag) return { label: "Geweest", kleur: "bg-slate-100 text-slate-400" };
  if (datum === vandaag) return { label: "Vandaag!", kleur: "bg-rose-100 text-rose-600" };
  const diff = Math.ceil((new Date(datum).getTime() - new Date(vandaag).getTime()) / 864e5);
  if (diff <= 2) return { label: `${diff}d`, kleur: "bg-amber-100 text-amber-700" };
  return { label: `${diff}d`, kleur: "bg-indigo-100 text-indigo-700" };
}

function dagLabel(datum: string) {
  return new Date(datum + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export default function AgendaPage() {
  const [huiswerk, setHuiswerk] = useState<HuiswerkItem[]>([]);
  const [toetsen, setToetsen] = useState<(Toetsmoment & { voltooid: boolean })[]>([]);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [formulier, setFormulier] = useState({ vak: "", omschrijving: "", deadline: vandaag });
  const [toonAfgerond, setToonAfgerond] = useState(false);

  function laad() {
    // Huiswerk
    const hw = getHuiswerk().sort((a, b) => {
      if (a.afgerond !== b.afgerond) return a.afgerond ? 1 : -1;
      return a.deadline.localeCompare(b.deadline);
    });
    setHuiswerk(hw);

    // Toetsen met voltooiingsstatus vanuit de planning
    const tm = getToetsmomenten()
      .filter((t) => t.datum >= vandaag)
      .sort((a, b) => a.datum.localeCompare(b.datum))
      .map((t) => {
        const plan = getPlan(t.id);
        const voltooid = !!plan && plan.dagen.length > 0 &&
          plan.dagen.every((d) => d.taken.every((tk) => tk.voltooid));
        return { ...t, voltooid };
      });
    setToetsen(tm);
  }

  useEffect(() => {
    laad();
    window.addEventListener("huiswerk-updated", laad);
    window.addEventListener("planning-updated", laad);
    return () => {
      window.removeEventListener("huiswerk-updated", laad);
      window.removeEventListener("planning-updated", laad);
    };
  }, []);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formulier.vak.trim() || !formulier.omschrijving.trim()) return;
    addHuiswerk(formulier.vak.trim(), formulier.omschrijving.trim(), formulier.deadline);
    addLog(`Huiswerk toegevoegd — ${formulier.vak.trim()}: ${formulier.omschrijving.trim()} (deadline ${formulier.deadline})`);
    setFormulier({ vak: "", omschrijving: "", deadline: vandaag });
    setToonFormulier(false);
  }

  const zichtbaarHuiswerk = toonAfgerond ? huiswerk : huiswerk.filter((h) => !h.afgerond);
  const aantalAfgerond = huiswerk.filter((h) => h.afgerond).length;

  return (
    <main className="flex-1 min-h-screen bg-slate-200 py-10 px-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-indigo-900 mb-1">Agenda</h1>
            <p className="text-indigo-500 text-sm">Huiswerk en toetsen op één plek 📋</p>
          </div>
          <button
            data-ptour="huiswerk-toevoegen"
            onClick={() => setToonFormulier((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Huiswerk toevoegen
          </button>
        </div>

        {/* Formulier */}
        {toonFormulier && (
          <form onSubmit={handleSubmit} className="mb-8 p-5 bg-white rounded-2xl border border-purple-100 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-purple-700">✏️ Nieuw huiswerk</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-purple-400">Vak</label>
                <input
                  value={formulier.vak}
                  onChange={(e) => setFormulier((f) => ({ ...f, vak: e.target.value }))}
                  placeholder="bijv. Wiskunde"
                  required
                  className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-purple-400">Deadline</label>
                <input
                  type="date"
                  value={formulier.deadline}
                  min={vandaag}
                  onChange={(e) => setFormulier((f) => ({ ...f, deadline: e.target.value }))}
                  required
                  className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-purple-400">Omschrijving</label>
              <input
                value={formulier.omschrijving}
                onChange={(e) => setFormulier((f) => ({ ...f, omschrijving: e.target.value }))}
                placeholder="bijv. Oefeningen 3.4 t/m 3.8 maken"
                required
                className="px-3 py-2 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-900 outline-none focus:border-purple-400"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-lg shadow-md hover:opacity-90 transition-opacity">
                Opslaan
              </button>
              <button type="button" onClick={() => setToonFormulier(false)} className="px-4 py-2 border border-purple-200 text-purple-500 text-sm rounded-lg hover:bg-purple-50">
                Annuleren
              </button>
            </div>
          </form>
        )}

        {/* ── Huiswerk ── */}
        <div data-ptour="huiswerk-sectie" className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              📝 Huiswerk
              {aantalAfgerond > 0 && (
                <span className="text-xs font-normal text-slate-400">({aantalAfgerond} afgerond)</span>
              )}
            </h2>
            {aantalAfgerond > 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toonAfgerond}
                  onChange={(e) => setToonAfgerond(e.target.checked)}
                  className="accent-purple-600 w-3 h-3"
                />
                <span className="text-xs text-slate-400">Toon afgerond</span>
              </label>
            )}
          </div>

          {zichtbaarHuiswerk.length === 0 ? (
            <div className="py-10 text-center bg-white rounded-2xl border border-purple-100">
              <p className="text-slate-400 text-sm">
                {huiswerk.length === 0 ? "Nog geen huiswerk toegevoegd." : "Alles afgerond! 🎉"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {zichtbaarHuiswerk.map((h) => {
                const badge = deadlineBadge(h.deadline, h.afgerond);
                return (
                  <div
                    key={h.id}
                    className={`flex items-start gap-3 p-4 bg-white rounded-2xl border shadow-sm transition-all ${h.afgerond ? "border-emerald-100 opacity-60" : "border-purple-100"}`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => { toggleHuiswerk(h.id); addLog(`Huiswerk ${h.afgerond ? "heropend" : "afgevinkt"} — ${h.vak}: ${h.omschrijving}`); laad(); }}
                      className={`mt-0.5 w-5 h-5 rounded-full shrink-0 border-2 flex items-center justify-center transition-all ${h.afgerond ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-purple-400"}`}
                    >
                      {h.afgerond && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Inhoud */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-purple-700">{h.vak}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.kleur}`}>{badge.label}</span>
                      </div>
                      <p className={`text-sm text-slate-700 ${h.afgerond ? "line-through text-slate-400" : ""}`}>
                        {h.omschrijving}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{dagLabel(h.deadline)}</p>
                    </div>

                    {/* Verwijderen */}
                    <button
                      onClick={() => { addLog(`Huiswerk verwijderd — ${h.vak}: ${h.omschrijving}`); deleteHuiswerk(h.id); laad(); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-200 hover:text-rose-400 transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Toetsen ── */}
        <div data-ptour="toetsen-sectie">
          <h2 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
            📅 Toetsen
            <span className="text-xs font-normal text-slate-400">— automatisch vanuit je planning</span>
          </h2>

          {toetsen.length === 0 ? (
            <div className="py-10 text-center bg-white rounded-2xl border border-purple-100">
              <p className="text-slate-400 text-sm">Geen toetsen gepland. Voeg ze toe via de Planning.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {toetsen.map((t) => {
                const badge = toetsBadge(t.datum);
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 p-4 bg-white rounded-2xl border shadow-sm transition-all ${t.voltooid ? "border-emerald-100 opacity-60" : "border-purple-100"}`}
                  >
                    {/* Status (readonly — vanuit planning) */}
                    <div className={`w-5 h-5 rounded-full shrink-0 border-2 flex items-center justify-center ${t.voltooid ? "bg-emerald-500 border-emerald-500" : "border-slate-200"}`}>
                      {t.voltooid && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-bold text-indigo-900 ${t.voltooid ? "line-through text-slate-400" : ""}`}>
                          {t.vakNaam}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.kleur}`}>{badge.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{dagLabel(t.datum)}</p>
                    </div>

                    {t.voltooid ? (
                      <span className="text-xs text-emerald-600 font-semibold">Studiedoel behaald ✅</span>
                    ) : (
                      <span className="text-xs text-purple-400 italic">Vink af via Planning</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      <PageTour stappen={[
        { emoji: "📋", titel: "Agenda", beschrijving: "Op de Agenda pagina zie je al je huiswerk en aankomende toetsen op één plek. Zo vergeet je nooit meer wat je moet doen." },
        { target: "huiswerk-toevoegen", emoji: "➕", titel: "Huiswerk toevoegen", beschrijving: "Klik hier om een huiswerkopdracht toe te voegen. Geef het vak, de omschrijving en de deadline in — dan zie je het meteen in de lijst staan." },
        { target: "huiswerk-sectie", emoji: "✅", titel: "Huiswerk afvinken", beschrijving: "Vink huiswerk af zodra je het af hebt. Verlopen deadlines worden rood, dingen die vandaag af moeten oranje. Afgevinkte items kun je verbergen." },
        { target: "toetsen-sectie", emoji: "📅", titel: "Toetsen", beschrijving: "Hier zie je je toetsen automatisch vanuit je planning. Ze worden groen afgevinkt zodra je alle studietaken voor die toets hebt voltooid." },
      ]} />
    </main>
  );
}
