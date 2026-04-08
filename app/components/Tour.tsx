"use client";

import { useState, useEffect, useCallback } from "react";

type Stap = {
  target?: string; // data-tour attribuut
  emoji: string;
  titel: string;
  beschrijving: string;
};

const STAPPEN: Stap[] = [
  {
    emoji: "🎓",
    titel: "Welkom bij Studiehulp!",
    beschrijving: "Studiehulp helpt je slimmer te leren. Je kunt samenvattingen maken van je schoolboek, cijfers bijhouden, oefenen met je stof en een studieplan aanmaken. Laten we even een rondleiding doen!",
  },
  {
    target: "samenvattingen",
    emoji: "📷",
    titel: "Samenvattingen maken",
    beschrijving: "Houd je schoolboek voor de camera. De app herkent automatisch de pagina zodra die scherp in beeld is. AI maakt dan direct een samenvatting van wat je moet weten voor de toets — inclusief de belangrijkste begrippen en een handige tip.",
  },
  {
    target: "vakken",
    emoji: "📚",
    titel: "Vakken & Hoofdstukken",
    beschrijving: "Voeg je vakken toe via het plusje. Per vak maak je hoofdstukken aan. Samenvattingen worden per paginanummer opgeslagen in het juiste hoofdstuk, zodat je altijd alles terug kunt vinden.",
  },
  {
    target: "cijfers",
    emoji: "📊",
    titel: "Mijn cijfers",
    beschrijving: "Voer je toetscijfers in per vak. Je kunt aangeven hoe zwaar een cijfer meetelt (1× t/m 5×). De app berekent automatisch je gewogen gemiddelde en laat zien of je trend omhoog of omlaag gaat — met 📈 of 📉.",
  },
  {
    target: "oefenen",
    emoji: "🧠",
    titel: "Oefenen",
    beschrijving: "Klik op een hoofdstuk onder Oefenen om te starten. Bij taalvakken kun je woordjes oefenen: AI haalt de vreemde woorden uit je aantekeningen en vraagt jou de vertaling te typen — of andersom. Bij alle vakken kun je jezelf laten overhoren: AI stelt 5 vragen en beoordeelt je antwoorden.",
  },
  {
    target: "assistent",
    emoji: "🤖",
    titel: "Studieassistent",
    beschrijving: "Heb je een vraag over de stof? Typ hem hier! De assistent legt alles uit in gewone taal, speciaal voor jou. Je kunt vragen over wiskunde, talen, geschiedenis, biologie — alles wat met school te maken heeft.",
  },
  {
    target: "planning",
    emoji: "📅",
    titel: "Planning",
    beschrijving: "Voer in wanneer je een toets hebt en welke hoofdstukken eraan meegedaan. AI maakt dan een dag-voor-dag studieplan: eerst nieuwe stof leren, daarna herhalen, en de laatste dagen alleen overhoren. Na elke studeersessie controleert AI of je de stof echt kent.",
  },
  {
    emoji: "🚀",
    titel: "Klaar om te starten!",
    beschrijving: "Je weet nu hoe Studiehulp werkt. Begin met een foto van je schoolboek te scannen, voeg je vakken toe en ga aan de slag. Succes met leren — je kunt het! 💪",
  },
];

const GEZIEN_KEY = "studiehulp_tour_gezien";

export default function Tour() {
  const [actief, setActief] = useState(false);
  const [stapIndex, setStapIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const stap = STAPPEN[stapIndex];

  const updateSpotlight = useCallback(() => {
    if (!stap.target) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${stap.target}"]`);
    if (el) setSpotlightRect(el.getBoundingClientRect());
  }, [stap.target]);

  useEffect(() => {
    if (actief) updateSpotlight();
  }, [actief, stapIndex, updateSpotlight]);

  useEffect(() => {
    function startHandler() {
      setStapIndex(0);
      setActief(true);
    }
    window.addEventListener("start-tour", startHandler);

    // Toon automatisch bij eerste bezoek
    if (!localStorage.getItem(GEZIEN_KEY)) {
      setTimeout(() => {
        setStapIndex(0);
        setActief(true);
      }, 800);
    }

    return () => window.removeEventListener("start-tour", startHandler);
  }, []);

  function volgende() {
    if (stapIndex + 1 >= STAPPEN.length) {
      sluit();
    } else {
      setStapIndex((i) => i + 1);
    }
  }

  function vorige() {
    setStapIndex((i) => Math.max(0, i - 1));
  }

  function sluit() {
    setActief(false);
    localStorage.setItem(GEZIEN_KEY, "1");
  }

  if (!actief) return null;

  // Kaart positionering
  const SIDEBAR_BREEDTE = 240;
  const KAART_BREEDTE = 340;
  const MARGE = 16;

  const kaartLinks = SIDEBAR_BREEDTE + MARGE;
  let kaartBoven: number | string = "50%";
  let kaartTransform = "translateY(-50%)";

  if (spotlightRect) {
    const midden = spotlightRect.top + spotlightRect.height / 2;
    const vensterhoogte = window.innerHeight;
    kaartBoven = Math.min(Math.max(midden - 120, MARGE), vensterhoogte - 280);
    kaartTransform = "none";
  }

  return (
    <>
      {/* Donkere overlay */}
      <div
        className="fixed inset-0 z-[9997] pointer-events-none"
        style={{ background: "rgba(0,0,0,0.65)" }}
      />

      {/* Spotlight over het doel-element */}
      {spotlightRect && (
        <div
          className="fixed z-[9998] pointer-events-none rounded-xl transition-all duration-300"
          style={{
            top: spotlightRect.top - 6,
            left: spotlightRect.left - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 3px rgba(167,139,250,0.8)",
          }}
        />
      )}

      {/* Uitlegkaart */}
      <div
        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto"
        style={{
          left: stap.target ? kaartLinks : "50%",
          top: stap.target ? kaartBoven : "50%",
          transform: stap.target ? kaartTransform : "translate(-50%, -50%)",
          width: KAART_BREEDTE,
        }}
      >
        {/* Pijltje naar sidebar als er een target is */}
        {spotlightRect && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -left-3 w-0 h-0"
            style={{
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              borderRight: "12px solid white",
            }}
          />
        )}

        {/* Stap indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            {STAPPEN.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === stapIndex ? "w-6 bg-purple-600" : i < stapIndex ? "w-2 bg-purple-300" : "w-2 bg-slate-200"}`}
              />
            ))}
          </div>
          <button onClick={sluit} className="text-slate-300 hover:text-slate-500 text-lg leading-none transition-colors">×</button>
        </div>

        {/* Inhoud */}
        <div className="text-4xl mb-3">{stap.emoji}</div>
        <h2 className="text-lg font-bold text-indigo-900 mb-2">{stap.titel}</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{stap.beschrijving}</p>

        {/* Navigatie */}
        <div className="flex items-center justify-between">
          <button
            onClick={vorige}
            disabled={stapIndex === 0}
            className="text-xs text-purple-400 hover:text-purple-600 disabled:opacity-0 transition-colors"
          >
            ← Vorige
          </button>
          <span className="text-xs text-slate-300">{stapIndex + 1} / {STAPPEN.length}</span>
          <button
            onClick={volgende}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            {stapIndex + 1 < STAPPEN.length ? "Volgende →" : "Aan de slag! 🚀"}
          </button>
        </div>
      </div>
    </>
  );
}
