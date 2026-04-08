"use client";

import { useState, useEffect } from "react";
import { getLog, clearLog, formatLogTijd, type LogEntry } from "../lib/log";

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  function laad() {
    setEntries(getLog());
  }

  useEffect(() => {
    laad();
    window.addEventListener("log-updated", laad);
    return () => window.removeEventListener("log-updated", laad);
  }, []);

  function handleClear() {
    if (!confirm("Weet je zeker dat je de hele log wilt wissen?")) return;
    clearLog();
    setEntries([]);
  }

  return (
    <main className="flex-1 min-h-screen bg-slate-200 dark:bg-slate-900 py-10 px-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-indigo-900 dark:text-white mb-1">Activiteitenlog</h1>
            <p className="text-indigo-500 dark:text-indigo-300 text-sm">Alles wat jij hebt gedaan in Studiehulp 📋</p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
            >
              Log wissen
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-1">Nog geen activiteiten</p>
            <p className="text-sm text-purple-300 dark:text-purple-500">Zodra je iets doet in de app, verschijnt het hier.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-purple-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {entries.map((e) => (
                <div key={e.id} className="flex items-baseline gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                    {formatLogTijd(e.timestamp)}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {e.bericht}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
