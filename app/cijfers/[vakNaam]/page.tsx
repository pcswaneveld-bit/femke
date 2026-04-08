"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { getCijfers, deleteCijfer, type Cijfer } from "../../lib/store";

function cijferKleur(c: number): string {
  if (c >= 8) return "text-emerald-600";
  if (c >= 5.5) return "text-sky-600";
  return "text-rose-500";
}

function cijferBgKleur(c: number): string {
  if (c >= 8) return "bg-emerald-50 border-emerald-100";
  if (c >= 5.5) return "bg-white border-slate-200";
  return "bg-rose-50 border-rose-100";
}

export default function VakCijfersPage() {
  const { vakNaam: encoded } = useParams<{ vakNaam: string }>();
  const vakNaam = decodeURIComponent(encoded);
  const [cijfers, setCijfers] = useState<Cijfer[]>([]);

  function load() {
    setCijfers(
      getCijfers()
        .filter((c) => c.vakNaam === vakNaam)
        .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
    );
  }

  useEffect(() => {
    load();
    window.addEventListener("cijfers-updated", load);
    return () => window.removeEventListener("cijfers-updated", load);
  }, [vakNaam]);

  const totalePunten = cijfers.reduce((a, c) => a + c.cijfer * (c.weging ?? 1), 0);
  const totaleWeging = cijfers.reduce((a, c) => a + (c.weging ?? 1), 0);
  const gemGetal = totaleWeging > 0 ? totalePunten / totaleWeging : 0;
  const gemiddelde = cijfers.length > 0 ? gemGetal.toFixed(1) : null;

  // Trend berekenen op volgorde van datum (oudste eerst)
  function berekenTrend(cs: typeof cijfers): "omhoog" | "omlaag" | "stabiel" | null {
    if (cs.length < 2) return null;
    const gesorteerd = [...cs].sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());
    const n = gesorteerd.length;
    const sumX = (n * (n - 1)) / 2;
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const sumY = gesorteerd.reduce((a, c) => a + c.cijfer, 0);
    const sumXY = gesorteerd.reduce((a, c, i) => a + i * c.cijfer, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    if (slope > 0.15) return "omhoog";
    if (slope < -0.15) return "omlaag";
    return "stabiel";
  }

  const trend = berekenTrend(cijfers);

  function handleDelete(id: string) {
    if (!confirm("Cijfer verwijderen?")) return;
    deleteCijfer(id);
  }

  return (
    <main className="flex-1 min-h-screen bg-slate-200 py-10 px-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/cijfers" className="text-xs text-purple-400 hover:text-purple-600 transition-colors">
          ← Mijn cijfers
        </Link>

        <div className="flex items-end justify-between mt-4 mb-8">
          <h1 className="text-4xl font-bold text-indigo-900">{vakNaam}</h1>
          {gemiddelde && (
            <div className="text-right bg-white rounded-2xl px-5 py-3 border border-purple-100 shadow-sm">
              <p className="text-xs text-indigo-400 mb-0.5">Gemiddelde</p>
              <div className="flex items-center justify-end gap-2">
                <p className={`text-3xl font-bold ${cijferKleur(gemGetal)}`}>{gemiddelde}</p>
                {trend === "omhoog" && <span className="text-2xl" title="Trend: stijgend">📈</span>}
                {trend === "omlaag" && <span className="text-2xl" title="Trend: dalend">📉</span>}
                {trend === "stabiel" && <span className="text-xl text-purple-300" title="Trend: stabiel">→</span>}
              </div>
              {trend && (
                <p className={`text-xs mt-0.5 ${trend === "omhoog" ? "text-emerald-500" : trend === "omlaag" ? "text-rose-400" : "text-purple-300"}`}>
                  {trend === "omhoog" ? "Stijgende trend" : trend === "omlaag" ? "Dalende trend" : "Stabiel"}
                </p>
              )}
            </div>
          )}
        </div>

        {cijfers.length === 0 ? (
          <p className="text-sm text-purple-300">Geen cijfers gevonden voor dit vak.</p>
        ) : (
          <div className="space-y-3">
            {cijfers.map((c) => (
              <div key={c.id} className={`flex items-center gap-4 p-4 border rounded-2xl group shadow-sm ${cijferBgKleur(c.cijfer)}`}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white shadow-sm shrink-0">
                  <span className={`text-xl font-bold ${cijferKleur(c.cijfer)}`}>
                    {c.cijfer % 1 === 0 ? c.cijfer.toFixed(0) : c.cijfer}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-purple-900">{c.toets}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-purple-500">
                      {new Date(c.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    {(c.weging ?? 1) > 1 && (
                      <span className="text-xs bg-purple-100 text-purple-600 font-semibold px-1.5 py-0.5 rounded-full">
                        {c.weging}×
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-purple-200 hover:text-red-400 transition-all rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link href="/cijfers" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-200 hover:opacity-90 transition-opacity">
            + Nieuw cijfer toevoegen
          </Link>
        </div>
      </div>
    </main>
  );
}
