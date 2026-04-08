"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getVakken, addVak, getCijfers, type Vak } from "../lib/store";
import { addLog } from "../lib/log";

export default function Sidebar() {
  const pathname = usePathname();
  const [vakken, setVakken] = useState<Vak[]>([]);
  const [expandedVakken, setExpandedVakken] = useState<Set<string>>(new Set());
  const [addingVak, setAddingVak] = useState(false);
  const [newVakNaam, setNewVakNaam] = useState("");
  const [cijferVakken, setCijferVakken] = useState<string[]>([]);
  const [openSamenvatting, setOpenSamenvatting] = useState(true);
  const [openCijfers, setOpenCijfers] = useState(true);
  const [openOefenen, setOpenOefenen] = useState(true);
  const [expandedOefenVakken, setExpandedOefenVakken] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVakken(getVakken());
    const refresh = () => setVakken(getVakken());
    window.addEventListener("vakken-updated", refresh);
    return () => window.removeEventListener("vakken-updated", refresh);
  }, []);

  useEffect(() => {
    const load = () => {
      const namen = [...new Set(getCijfers().map((c) => c.vakNaam))].sort();
      setCijferVakken(namen);
    };
    load();
    window.addEventListener("cijfers-updated", load);
    return () => window.removeEventListener("cijfers-updated", load);
  }, []);

  useEffect(() => {
    const match = pathname.match(/^\/vakken\/([^/]+)/);
    if (match) setExpandedVakken((prev) => new Set([...prev, match[1]]));
  }, [pathname]);

  useEffect(() => {
    if (addingVak) inputRef.current?.focus();
  }, [addingVak]);

  function toggleVak(id: string) {
    setExpandedVakken((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAddVak(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newVakNaam.trim()) return;
    const vak = addVak(newVakNaam.trim());
    addLog(`Vak toegevoegd — ${newVakNaam.trim()}`);
    setVakken(getVakken());
    setExpandedVakken((prev) => new Set([...prev, vak.id]));
    setNewVakNaam("");
    setAddingVak(false);
  }

  const [mobileOpen, setMobileOpen] = useState(false);

  // Sluit menu bij navigatie op mobiel
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* Mobiele hamburger knop */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-900 to-purple-900 text-white flex items-center justify-center shadow-lg"
        aria-label="Menu"
      >
        {mobileOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Overlay op mobiel */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

    <aside className={`
      w-60 shrink-0 min-h-screen flex flex-col bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-950
      md:relative md:translate-x-0 md:z-auto
      fixed inset-y-0 left-0 z-50 transition-transform duration-300
      ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
    `}>
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🎓</span>
          <span className="text-white font-bold text-lg tracking-tight">
            Studie<span className="text-purple-300">hulp</span>
          </span>
        </div>
        <p className="text-purple-400 text-xs mt-1 ml-9">jouw slimme assistent</p>
      </div>

      <nav className="flex-1 px-3 pb-6 overflow-y-auto space-y-1">

        {/* ── Samenvatting maken ── */}
        <p className="px-3 pt-2 pb-1 text-xs font-semibold text-purple-400 uppercase tracking-widest">
          Leren
        </p>

        <div className="flex items-center gap-1" data-tour="samenvattingen">
          <Link
            href="/"
            className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === "/"
                ? "text-white"
                : "text-purple-200 hover:bg-white/8 hover:text-white"
            }`}
          >
            <span className="text-lg">📷</span>
            Samenvattingen
          </Link>
          <button
            onClick={() => setOpenSamenvatting((v) => !v)}
            className="p-1.5 text-purple-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${openSamenvatting ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Vakken submenu */}
        {openSamenvatting && <div data-tour="vakken" className="ml-3 pl-3 border-l border-purple-800 space-y-0.5">
          {vakken.map((vak) => {
            const expanded = expandedVakken.has(vak.id);
            const vakActive = pathname.startsWith(`/vakken/${vak.id}`);
            return (
              <div key={vak.id}>
                <button
                  onClick={() => toggleVak(vak.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    vakActive ? "text-white bg-white/10" : "text-purple-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${vak.kleur}`} />
                  <span className="flex-1 text-left truncate">{vak.naam}</span>
                  <svg className={`w-3 h-3 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {expanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {vak.hoofdstukken.length === 0 && (
                      <span className="block px-2 py-1 text-xs text-purple-600 italic">Geen hoofdstukken</span>
                    )}
                    {vak.hoofdstukken.map((h) => {
                      const href = `/vakken/${vak.id}/${h.id}`;
                      return (
                        <Link key={h.id} href={href} className={`block px-2 py-1 rounded-lg text-xs transition-all truncate ${pathname === href ? "text-white bg-white/10" : "text-purple-400 hover:text-white hover:bg-white/5"}`}>
                          {h.naam}
                        </Link>
                      );
                    })}
                    <Link href={`/vakken/${vak.id}`} className="block px-2 py-1 text-xs text-purple-600 hover:text-purple-300 transition-colors">
                      + Hoofdstuk toevoegen
                    </Link>
                  </div>
                )}
              </div>
            );
          })}

          {addingVak ? (
            <form onSubmit={handleAddVak} className="px-2 py-1">
              <input
                ref={inputRef}
                value={newVakNaam}
                onChange={(e) => setNewVakNaam(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setAddingVak(false)}
                placeholder="Naam vak…"
                className="w-full bg-white/10 text-white placeholder-purple-400 text-xs rounded-lg px-2 py-1.5 outline-none border border-purple-700 focus:border-purple-400"
              />
            </form>
          ) : (
            <button onClick={() => setAddingVak(true)} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-purple-500 hover:text-purple-300 transition-colors rounded-lg hover:bg-white/5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Vak toevoegen
            </button>
          )}
        </div>}

        {/* ── Mijn cijfers ── */}
        <p className="px-3 pt-4 pb-1 text-xs font-semibold text-purple-400 uppercase tracking-widest">
          Resultaten
        </p>

        <div data-tour="cijfers" className="flex items-center gap-1">
          <Link
            href="/cijfers"
            className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname.startsWith("/cijfers")
                ? "text-white"
                : "text-purple-200 hover:bg-white/8 hover:text-white"
            }`}
          >
            <span className="text-lg">📊</span>
            Mijn cijfers
          </Link>
          <button
            onClick={() => setOpenCijfers((v) => !v)}
            className="p-1.5 text-purple-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${openCijfers ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {openCijfers && cijferVakken.length > 0 && (
          <div className="ml-3 pl-3 border-l border-purple-800 space-y-0.5">
            {cijferVakken.map((naam) => {
              const href = `/cijfers/${encodeURIComponent(naam)}`;
              return (
                <Link key={naam} href={href} className={`block px-2 py-1.5 rounded-lg text-xs font-medium transition-all truncate ${pathname === href ? "text-white bg-white/10" : "text-purple-300 hover:text-white hover:bg-white/5"}`}>
                  {naam}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Assistent ── */}
        <p className="px-3 pt-4 pb-1 text-xs font-semibold text-purple-400 uppercase tracking-widest">
          Hulp
        </p>

        <Link
          href="/agenda"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname === "/agenda"
              ? "text-white"
              : "text-purple-200 hover:bg-white/8 hover:text-white"
          }`}
        >
          <span className="text-lg">📋</span>
          Agenda
        </Link>

        <Link
          data-tour="assistent"
          href="/assistent"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname === "/assistent"
              ? "text-white"
              : "text-purple-200 hover:bg-white/8 hover:text-white"
          }`}
        >
          <span className="text-lg">🤖</span>
          Studieassistent
        </Link>

        <Link
          data-tour="planning"
          href="/planning"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname === "/planning"
              ? "text-white"
              : "text-purple-200 hover:bg-white/8 hover:text-white"
          }`}
        >
          <span className="text-lg">📅</span>
          Planning
        </Link>

        {/* ── Oefenen ── */}
        <p className="px-3 pt-4 pb-1 text-xs font-semibold text-purple-400 uppercase tracking-widest">
          Oefenen
        </p>

        <div data-tour="oefenen" className="flex items-center gap-1">
          <span className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-purple-200">
            <span className="text-lg">🧠</span>
            Oefenen
          </span>
          <button
            onClick={() => setOpenOefenen((v) => !v)}
            className="p-1.5 text-purple-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${openOefenen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {openOefenen && (() => {
          const oefeVakken = vakken.filter((v) =>
            v.hoofdstukken.some((h) => h.samenvattingen.length > 0)
          );
          if (oefeVakken.length === 0) return (
            <p className="px-4 py-1 text-xs text-purple-700 italic">Nog geen samenvattingen</p>
          );
          return (
            <div className="ml-3 pl-3 border-l border-purple-800 space-y-0.5">
              {oefeVakken.map((vak) => {
                const expanded = expandedOefenVakken.has(vak.id);
                const hoofdstukken = vak.hoofdstukken.filter((h) => h.samenvattingen.length > 0);
                return (
                  <div key={vak.id}>
                    <button
                      onClick={() => setExpandedOefenVakken((prev) => {
                        const next = new Set(prev);
                        next.has(vak.id) ? next.delete(vak.id) : next.add(vak.id);
                        return next;
                      })}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-purple-300 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${vak.kleur}`} />
                      <span className="flex-1 text-left truncate">{vak.naam}</span>
                      <svg className={`w-3 h-3 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {expanded && (
                      <div className="ml-4 mt-0.5 space-y-0.5">
                        {hoofdstukken.map((h) => {
                          const href = `/oefenen/${vak.id}/${h.id}`;
                          return (
                            <Link key={h.id} href={href} className={`block px-2 py-1 rounded-lg text-xs transition-all truncate ${pathname === href ? "text-white bg-white/10" : "text-purple-400 hover:text-white hover:bg-white/5"}`}>
                              {h.naam}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

            </div>
          );
        })()}
      </nav>

    </aside>
    </>
  );
}
