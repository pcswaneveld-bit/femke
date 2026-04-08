"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  getVakken,
  deleteSamenvatting,
  type Vak,
  type Hoofdstuk,
} from "../../../lib/store";

export default function HoofdstukPage() {
  const { vakId, hoofdstukId } = useParams<{ vakId: string; hoofdstukId: string }>();
  const [vak, setVak] = useState<Vak | null>(null);
  const [hoofdstuk, setHoofdstuk] = useState<Hoofdstuk | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load() {
    const v = getVakken().find((v) => v.id === vakId) ?? null;
    setVak(v);
    setHoofdstuk(v?.hoofdstukken.find((h) => h.id === hoofdstukId) ?? null);
  }

  useEffect(() => {
    load();
    window.addEventListener("vakken-updated", load);
    return () => window.removeEventListener("vakken-updated", load);
  }, [vakId, hoofdstukId]);

  if (!vak || !hoofdstuk) return null;

  const gesorteerd = [...hoofdstuk.samenvattingen].sort(
    (a, b) => a.paginanummer - b.paginanummer
  );

  function handleDelete(samenvattingId: string) {
    if (!confirm("Samenvatting verwijderen?")) return;
    deleteSamenvatting(vakId, hoofdstukId, samenvattingId);
  }

  return (
    <main className="flex-1 min-h-screen bg-slate-200 py-10 px-8">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-indigo-700 transition-colors">
            Samenvatting maken
          </Link>
          <span>/</span>
          <Link href={`/vakken/${vak.id}`} className="hover:text-indigo-700 transition-colors flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${vak.kleur}`} />
            {vak.naam}
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">{hoofdstuk.naam}</span>
        </div>

        <h1 className="text-4xl font-bold text-indigo-900 mb-2">
          {hoofdstuk.naam}
        </h1>
        <p className="text-slate-500 mb-8">
          {gesorteerd.length === 0
            ? "Nog geen samenvattingen opgeslagen."
            : `${gesorteerd.length} ${gesorteerd.length === 1 ? "samenvatting" : "samenvattingen"}, gesorteerd op paginanummer`}
        </p>

        {/* Samenvattingen */}
        <div className="space-y-3">
          {gesorteerd.map((s) => {
            const expanded = expandedId === s.id;
            return (
              <div
                key={s.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left group hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700 shrink-0">
                    {s.paginanummer}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      Pagina {s.paginanummer}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {s.inhoud.split("\n")[0]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">
                      {new Date(s.aangemaakt).toLocaleDateString("nl-NL")}
                    </span>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expanded && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 mt-4">
                      {s.inhoud}
                    </p>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="mt-4 text-xs text-rose-400 hover:text-rose-600 transition-colors"
                    >
                      Samenvatting verwijderen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {gesorteerd.length === 0 && (
          <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-sm">
              Scan een pagina en sla de samenvatting op in dit hoofdstuk.
            </p>
            <Link
              href="/"
              className="inline-block mt-3 text-sm text-zinc-900 dark:text-zinc-50 font-medium underline underline-offset-2"
            >
              Ga naar samenvatting maken
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
