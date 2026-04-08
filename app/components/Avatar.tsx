"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getTotaalSterren } from "../lib/voortgang";
import { addLog } from "../lib/log";

const DARK_UNLOCK_STERREN = 15;

export default function Avatar() {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sterren, setSterren] = useState({ totaal: 0, perNiveau: { brons: 0, zilver: 0, goud: 0 } });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opgeslagen = localStorage.getItem("studiehulp_thema");
    setDarkMode(opgeslagen === "dark");
    setSterren(getTotaalSterren());
  }, []);

  // Herlaad sterren als oefensessie klaar is
  useEffect(() => {
    const handler = () => setSterren(getTotaalSterren());
    window.addEventListener("vakken-updated", handler);
    return () => window.removeEventListener("vakken-updated", handler);
  }, []);

  const darkUnlocked = sterren.totaal >= DARK_UNLOCK_STERREN;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleDarkMode() {
    const nieuw = !darkMode;
    setDarkMode(nieuw);
    if (nieuw) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("studiehulp_thema", "dark");
      addLog("Donker thema ingeschakeld");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("studiehulp_thema", "light");
      addLog("Licht thema ingeschakeld");
    }
  }

  return (
    <div ref={ref} className="fixed top-4 right-4 z-40">
      {/* Avatar knop */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all"
        title="Accountmenu"
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-purple-100 dark:border-slate-700 overflow-hidden">
          {/* Profielkop */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Mijn account</p>
                <p className="text-purple-200 text-xs">Scholier</p>
              </div>
            </div>
          </div>

          {/* Sterren */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Verdiende sterren</p>
            <div className="flex items-center gap-3">
              {[
                { label: "🥉", count: sterren.perNiveau.brons, kleur: "text-orange-400" },
                { label: "🥈", count: sterren.perNiveau.zilver, kleur: "text-slate-400" },
                { label: "🥇", count: sterren.perNiveau.goud, kleur: "text-yellow-400" },
              ].map(({ label, count, kleur }) => (
                <div key={label} className="flex items-center gap-1">
                  <span>{label}</span>
                  <span className={`text-sm font-bold ${kleur}`}>{count}</span>
                </div>
              ))}
              <span className="ml-auto text-xs font-semibold text-slate-500">
                {sterren.totaal} / {DARK_UNLOCK_STERREN}
              </span>
            </div>
            {/* Voortgangsbalk */}
            <div className="mt-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((sterren.totaal / DARK_UNLOCK_STERREN) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Dark mode toggle */}
          <div className="px-4 py-3">
            {darkUnlocked ? (
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{darkMode ? "☀️" : "🌙"}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {darkMode ? "Licht thema" : "Donker thema"}
                  </span>
                </div>
                <div className={`relative w-10 h-5 rounded-full transition-colors ${darkMode ? "bg-purple-600" : "bg-slate-200"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </button>
            ) : (
              <div className="flex items-start gap-2.5">
                <span className="text-lg">🔒</span>
                <div>
                  <p className="text-sm font-medium text-slate-400">Donker thema</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verdien nog <span className="font-bold text-purple-500">{DARK_UNLOCK_STERREN - sterren.totaal}</span> ster{DARK_UNLOCK_STERREN - sterren.totaal !== 1 ? "ren" : ""} om dit te ontgrendelen
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4" />

          {/* Log */}
          <div className="px-4 py-3">
            <Link
              href="/log"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <span className="text-lg">📋</span>
              Activiteitenlog
            </Link>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4" />

          {/* Rondleiding */}
          <div className="px-4 py-3">
            <button
              onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("start-tour")); }}
              className="w-full flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <span className="text-lg">❓</span>
              Rondleiding starten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
