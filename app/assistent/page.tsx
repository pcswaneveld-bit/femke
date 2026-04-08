"use client";

import { useState, useRef, useEffect } from "react";
import PageTour from "../components/PageTour";

type Bericht = { rol: "leerling" | "assistent"; tekst: string };

const SUGGESTIES = [
  "Kun je uitleggen hoe fotosynthese werkt?",
  "Wat is het verschil tussen een werkwoord en een bijvoeglijk naamwoord?",
  "Hoe los ik een vergelijking op met twee onbekenden?",
  "Wanneer gebruik ik 'imparfait' en wanneer 'passé composé'?",
  "Wat veroorzaakte de Tweede Wereldoorlog?",
];

export default function AssistentPage() {
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [invoer, setInvoer] = useState("");
  const [laden, setLaden] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [berichten, laden]);

  async function stuurBericht(tekst: string) {
    if (!tekst.trim() || laden) return;
    const nieuwBericht: Bericht = { rol: "leerling", tekst: tekst.trim() };
    const bijgewerkt = [...berichten, nieuwBericht];
    setBerichten(bijgewerkt);
    setInvoer("");
    setLaden(true);

    try {
      const res = await fetch("/api/assistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ berichten: bijgewerkt }),
      });
      const data = await res.json();
      setBerichten((prev) => [...prev, { rol: "assistent", tekst: data.antwoord ?? "Sorry, er ging iets mis." }]);
    } catch {
      setBerichten((prev) => [...prev, { rol: "assistent", tekst: "Oeps, ik kon de server niet bereiken. Probeer het opnieuw." }]);
    } finally {
      setLaden(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      stuurBericht(invoer);
    }
  }

  return (
    <main className="flex-1 min-h-screen bg-slate-200 flex flex-col">

      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-purple-100 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
            <span className="text-2xl">🤖</span> Studieassistent
          </h1>
          <p className="text-sm text-indigo-400 mt-0.5">Stel al je schoolvragen — ik leg het uit in gewone taal</p>
        </div>
      </div>

      {/* Chatvenster */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Welkomstbericht */}
          {berichten.length === 0 && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="text-2xl shrink-0">🤖</span>
                <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm border border-purple-100 max-w-lg">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Hé! Ik ben jouw studieassistent 👋<br />
                    Heb je een vraag over school? Stel hem gerust — ik leg alles uit in gewone taal. Of klik op een van de voorbeelden hieronder om te beginnen.
                  </p>
                </div>
              </div>

              <div data-ptour="suggesties" className="ml-10 flex flex-wrap gap-2">
                {SUGGESTIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => stuurBericht(s)}
                    className="px-3 py-1.5 bg-white border border-purple-200 text-purple-700 text-xs rounded-full hover:bg-purple-50 hover:border-purple-400 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Berichten */}
          {berichten.map((b, i) => (
            <div key={i} className={`flex gap-3 ${b.rol === "leerling" ? "flex-row-reverse" : ""}`}>
              <span className="text-2xl shrink-0">{b.rol === "leerling" ? "🧑‍🎓" : "🤖"}</span>
              <div
                className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed max-w-lg whitespace-pre-wrap ${
                  b.rol === "leerling"
                    ? "bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-tr-sm"
                    : "bg-white border border-purple-100 text-slate-700 rounded-tl-sm"
                }`}
              >
                {b.tekst}
              </div>
            </div>
          ))}

          {/* Laad-indicator */}
          {laden && (
            <div className="flex gap-3">
              <span className="text-2xl shrink-0">🤖</span>
              <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm border border-purple-100">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Invoerveld */}
      <div data-ptour="invoer" className="px-8 py-4 bg-white border-t border-purple-100 shadow-sm">
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={invoer}
            onChange={(e) => setInvoer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stel je schoolvraag… (Enter om te sturen)"
            rows={1}
            disabled={laden}
            className="flex-1 px-4 py-3 text-sm bg-purple-50 border border-purple-200 rounded-xl text-purple-900 outline-none focus:border-purple-400 resize-none disabled:opacity-50 leading-relaxed"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            onClick={() => stuurBericht(invoer)}
            disabled={!invoer.trim() || laden}
            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="max-w-2xl mx-auto text-xs text-slate-400 mt-2">
          Alleen schoolvragen — ik help niet met andere onderwerpen.
        </p>
      </div>
      <PageTour stappen={[
        { emoji: "🤖", titel: "Studieassistent", beschrijving: "Hier kun je al je schoolvragen stellen. De assistent legt alles uit in gewone taal — wiskunde, talen, geschiedenis, biologie, alles." },
        { target: "suggesties", emoji: "💡", titel: "Voorbeeldvragen", beschrijving: "Weet je niet waar je moet beginnen? Klik op een van de voorbeeldvragen om direct een gesprek te starten." },
        { target: "invoer", emoji: "✏️", titel: "Stel je vraag", beschrijving: "Typ hier je vraag en druk op Enter of op de knop. Je kunt gewone zinnen gebruiken — alsof je het aan een leraar vraagt." },
      ]} />
    </main>
  );
}
