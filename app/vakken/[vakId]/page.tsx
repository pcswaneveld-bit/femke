"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  getVakken,
  addHoofdstuk,
  updateVakNaam,
  updateHoofdstukNaam,
  deleteHoofdstuk,
  deleteVak,
  type Vak,
} from "../../lib/store";
import { addLog } from "../../lib/log";

export default function VakPage() {
  const { vakId } = useParams<{ vakId: string }>();
  const router = useRouter();
  const [vak, setVak] = useState<Vak | null>(null);
  const [editingNaam, setEditingNaam] = useState(false);
  const [vakNaam, setVakNaam] = useState("");
  const [addingHoofdstuk, setAddingHoofdstuk] = useState(false);
  const [newHoofdstukNaam, setNewHoofdstukNaam] = useState("");
  const [editingHoofdstukId, setEditingHoofdstukId] = useState<string | null>(null);
  const [editingHoofdstukNaam, setEditingHoofdstukNaam] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  function load() {
    const gevonden = getVakken().find((v) => v.id === vakId) ?? null;
    setVak(gevonden);
    if (gevonden) setVakNaam(gevonden.naam);
  }

  useEffect(() => {
    load();
    window.addEventListener("vakken-updated", load);
    return () => window.removeEventListener("vakken-updated", load);
  }, [vakId]);

  useEffect(() => {
    if (addingHoofdstuk) addInputRef.current?.focus();
  }, [addingHoofdstuk]);

  if (!vak) return null;

  function saveVakNaam() {
    if (!vakNaam.trim() || !vak) return;
    updateVakNaam(vak.id, vakNaam.trim());
    setEditingNaam(false);
  }

  function handleAddHoofdstuk(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newHoofdstukNaam.trim() || !vak) return;
    addHoofdstuk(vak.id, newHoofdstukNaam.trim());
    addLog(`Hoofdstuk toegevoegd — ${vak.naam} › ${newHoofdstukNaam.trim()}`);
    setNewHoofdstukNaam("");
    setAddingHoofdstuk(false);
  }

  function saveHoofdstukNaam(hoofdstukId: string) {
    if (!editingHoofdstukNaam.trim() || !vak) return;
    updateHoofdstukNaam(vak.id, hoofdstukId, editingHoofdstukNaam.trim());
    setEditingHoofdstukId(null);
  }

  function handleDeleteHoofdstuk(hoofdstukId: string) {
    if (!vak) return;
    if (!confirm("Hoofdstuk verwijderen? Alle samenvattingen gaan verloren.")) return;
    deleteHoofdstuk(vak.id, hoofdstukId);
  }

  function handleDeleteVak() {
    if (!vak) return;
    if (!confirm(`Vak "${vak.naam}" verwijderen? Alle hoofdstukken en samenvattingen gaan verloren.`)) return;
    deleteVak(vak.id);
    router.push("/");
  }

  return (
    <main className="flex-1 min-h-screen bg-slate-200 py-10 px-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-xs text-purple-400 hover:text-purple-600 transition-colors">
          ← Terug
        </Link>

        {/* Vak naam */}
        <div className="flex items-center gap-3 mt-4 mb-8">
          <span className={`w-3 h-3 rounded-full shrink-0 ${vak.kleur}`} />
          {editingNaam ? (
            <input
              autoFocus
              value={vakNaam}
              onChange={(e) => setVakNaam(e.target.value)}
              onBlur={saveVakNaam}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveVakNaam();
                if (e.key === "Escape") setEditingNaam(false);
              }}
              className="text-4xl font-bold bg-transparent border-b-2 border-purple-300 text-purple-900 outline-none w-full"
            />
          ) : (
            <h1
              className="text-4xl font-bold text-indigo-900 cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => setEditingNaam(true)}
              title="Klik om naam te wijzigen"
            >
              {vak.naam}
            </h1>
          )}
        </div>

        {/* Hoofdstukken */}
        <div className="space-y-2">
          {vak.hoofdstukken.length === 0 && !addingHoofdstuk && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-4">
              Nog geen hoofdstukken. Voeg je eerste hoofdstuk toe.
            </p>
          )}

          {vak.hoofdstukken.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 p-4 bg-white border border-purple-100 rounded-2xl shadow-sm group hover:shadow-md transition-shadow"
            >
              <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>

              {editingHoofdstukId === h.id ? (
                <input
                  autoFocus
                  value={editingHoofdstukNaam}
                  onChange={(e) => setEditingHoofdstukNaam(e.target.value)}
                  onBlur={() => saveHoofdstukNaam(h.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveHoofdstukNaam(h.id);
                    if (e.key === "Escape") setEditingHoofdstukId(null);
                  }}
                  className="flex-1 bg-transparent border-b border-zinc-400 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
                />
              ) : (
                <Link
                  href={`/vakken/${vak.id}/${h.id}`}
                  className="flex-1 text-sm font-semibold text-purple-900 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                >
                  {h.naam}
                </Link>
              )}

              <span className="text-xs text-purple-300 shrink-0">
                {h.samenvattingen.length} {h.samenvattingen.length === 1 ? "samenvatting" : "samenvattingen"}
              </span>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditingHoofdstukId(h.id); setEditingHoofdstukNaam(h.naam); }}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  title="Naam wijzigen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteHoofdstuk(h.id)}
                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Verwijderen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Hoofdstuk toevoegen */}
          {addingHoofdstuk ? (
            <form onSubmit={handleAddHoofdstuk} className="flex gap-2">
              <input
                ref={addInputRef}
                value={newHoofdstukNaam}
                onChange={(e) => setNewHoofdstukNaam(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setAddingHoofdstuk(false)}
                placeholder="Naam van het hoofdstuk…"
                className="flex-1 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Toevoegen
              </button>
              <button
                type="button"
                onClick={() => setAddingHoofdstuk(false)}
                className="px-4 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Annuleren
              </button>
            </form>
          ) : (
            <button
              onClick={() => setAddingHoofdstuk(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-purple-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50/50 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Hoofdstuk toevoegen
            </button>
          )}
        </div>

        {/* Vak verwijderen */}
        <div className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleDeleteVak}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Vak verwijderen
          </button>
        </div>
      </div>
    </main>
  );
}
