"use client";

import { useState, useCallback, useEffect } from "react";

export type PageTourStap = {
  target?: string; // data-tour attribuut op het element
  emoji: string;
  titel: string;
  beschrijving: string;
};

type Props = {
  stappen: PageTourStap[];
};

export default function PageTour({ stappen }: Props) {
  const [actief, setActief] = useState(false);
  const [stapIndex, setStapIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const stap = stappen[stapIndex];

  const updateSpotlight = useCallback(() => {
    if (!stap?.target) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(`[data-ptour="${stap.target}"]`);
    if (el) setSpotlightRect(el.getBoundingClientRect());
    else setSpotlightRect(null);
  }, [stap?.target]);

  useEffect(() => {
    if (actief) updateSpotlight();
  }, [actief, stapIndex, updateSpotlight]);

  useEffect(() => {
    if (!actief) return;
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [actief, updateSpotlight]);

  function start() {
    setStapIndex(0);
    setActief(true);
  }

  function volgende() {
    if (stapIndex + 1 >= stappen.length) sluit();
    else setStapIndex((i) => i + 1);
  }

  function vorige() {
    setStapIndex((i) => Math.max(0, i - 1));
  }

  function sluit() {
    setActief(false);
    setSpotlightRect(null);
  }

  // Kaartpositie: slim naast het spotlight-element plaatsen
  const KAART_BREEDTE = 320;
  const KAART_HOOGTE_SCHAT = 280;
  const MARGE = 16;

  type Kant = "links" | "rechts" | "onder" | "geen";

  let kaartStijl: React.CSSProperties;
  let pijlKant: Kant = "geen";

  if (!stap?.target || !spotlightRect) {
    kaartStijl = {
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: KAART_BREEDTE,
      zIndex: 9999,
    };
  } else {
    const vW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vH = typeof window !== "undefined" ? window.innerHeight : 800;
    const midY = spotlightRect.top + spotlightRect.height / 2;
    const topBegrensd = Math.min(Math.max(midY - KAART_HOOGTE_SCHAT / 2, MARGE), vH - KAART_HOOGTE_SCHAT - MARGE);

    const ruimteRechts = vW - spotlightRect.right - MARGE;
    const ruimteLinks = spotlightRect.left - MARGE;

    if (ruimteRechts >= KAART_BREEDTE + MARGE) {
      // Rechts van element
      pijlKant = "links";
      kaartStijl = { position: "fixed", left: spotlightRect.right + MARGE, top: topBegrensd, width: KAART_BREEDTE, zIndex: 9999 };
    } else if (ruimteLinks >= KAART_BREEDTE + MARGE) {
      // Links van element
      pijlKant = "rechts";
      kaartStijl = { position: "fixed", left: spotlightRect.left - KAART_BREEDTE - MARGE, top: topBegrensd, width: KAART_BREEDTE, zIndex: 9999 };
    } else {
      // Onder element, gecentreerd
      pijlKant = "geen";
      const links = Math.min(Math.max(spotlightRect.left, MARGE), vW - KAART_BREEDTE - MARGE);
      kaartStijl = { position: "fixed", left: links, top: spotlightRect.bottom + MARGE, width: KAART_BREEDTE, zIndex: 9999 };
    }
  }

  return (
    <>
      {/* Vraagteken knop */}
      <button
        onClick={start}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white text-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        title="Rondleiding voor deze pagina"
      >
        ?
      </button>

      {actief && (
        <>
          {/* Donkere overlay */}
          <div
            className="fixed inset-0 pointer-events-none"
            style={{ background: "rgba(0,0,0,0.6)", zIndex: 9997 }}
          />

          {/* Spotlight */}
          {spotlightRect && (
            <div
              className="fixed pointer-events-none rounded-xl transition-all duration-300"
              style={{
                zIndex: 9998,
                top: spotlightRect.top - 6,
                left: spotlightRect.left - 6,
                width: spotlightRect.width + 12,
                height: spotlightRect.height + 12,
                boxShadow:
                  "0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 3px rgba(167,139,250,0.85)",
              }}
            />
          )}

          {/* Uitlegkaart */}
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto"
            style={kaartStijl}
          >
            {/* Pijl naar element */}
            {pijlKant === "links" && (
              <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-0 h-0"
                style={{ borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderRight: "12px solid white" }} />
            )}
            {pijlKant === "rechts" && (
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-0 h-0"
                style={{ borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "12px solid white" }} />
            )}

            {/* Stap-indicator */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1.5">
                {stappen.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === stapIndex
                        ? "w-6 bg-purple-600"
                        : i < stapIndex
                        ? "w-2 bg-purple-300"
                        : "w-2 bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={sluit}
                className="text-slate-300 hover:text-slate-500 text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="text-3xl mb-2">{stap.emoji}</div>
            <h2 className="text-base font-bold text-indigo-900 mb-1.5">{stap.titel}</h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">{stap.beschrijving}</p>

            <div className="flex items-center justify-between">
              <button
                onClick={vorige}
                disabled={stapIndex === 0}
                className="text-xs text-purple-400 hover:text-purple-600 disabled:opacity-0 transition-colors"
              >
                ← Vorige
              </button>
              <span className="text-xs text-slate-300">{stapIndex + 1} / {stappen.length}</span>
              <button
                onClick={volgende}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                {stapIndex + 1 < stappen.length ? "Volgende →" : "Klaar 👍"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
