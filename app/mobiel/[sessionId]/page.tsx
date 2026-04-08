"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";

type Stap = "kiezen" | "preview" | "verzenden" | "klaar" | "fout";

export default function MobielPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [stap, setStap] = useState<Stap>("kiezen");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [foutmelding, setFoutmelding] = useState("");

  const cameraRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);


  function verwerkInput(ref: React.RefObject<HTMLInputElement | null>) {
    const file = ref.current?.files?.[0];
    if (!file) {
      alert("Selecteer eerst een foto.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setPreviewSrc(result);
        setStap("preview");
      }
    };
    reader.readAsDataURL(file);
  }

  async function verstuur() {
    if (!previewSrc) return;
    setStap("verzenden");
    try {
      const res = await fetch(`/api/mobiel/upload/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: previewSrc }),
      });
      if (res.ok) {
        setStap("klaar");
      } else {
        const data = await res.json();
        setFoutmelding(data.error ?? "Er ging iets mis");
        setStap("fout");
      }
    } catch {
      setFoutmelding("Kan geen verbinding maken met de computer");
      setStap("fout");
    }
  }

  function opnieuw() {
    setPreviewSrc(null);
    setStap("kiezen");
  }

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "#0f172a", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>

      {stap === "kiezen" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 360 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>📷</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "white", marginBottom: 8 }}>Pagina scannen</h1>
            <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>Kies een foto en tik daarna op "Verstuur foto".</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Optie 1 — camera:</p>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ color: "#e2e8f0", fontSize: 15, width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Optie 2 — galerij:</p>
            <input
              ref={galerieRef}
              type="file"
              accept="image/*"
              style={{ color: "#e2e8f0", fontSize: 15, width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            <button
              onClick={() => verwerkInput(cameraRef)}
              style={{ width: "100%", padding: "16px 0", borderRadius: 16, border: "none", background: "linear-gradient(to right, #7c3aed, #ec4899)", color: "white", fontWeight: 700, fontSize: 16, cursor: "pointer" }}
            >
              📸 Verstuur camera-foto
            </button>
            <button
              onClick={() => verwerkInput(galerieRef)}
              style={{ width: "100%", padding: "14px 0", borderRadius: 16, border: "2px solid #475569", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
            >
              🖼️ Verstuur galerij-foto
            </button>
          </div>
        </div>
      )}

      {stap === "preview" && previewSrc && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "white" }}>Ziet het er goed uit?</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="Voorbeeld" style={{ width: "100%", borderRadius: 16, maxHeight: "55vh", objectFit: "contain", border: "1px solid #334155" }} />
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <button onClick={opnieuw} style={{ flex: 1, padding: "16px 0", borderRadius: 16, border: "2px solid #475569", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>
              Opnieuw
            </button>
            <button onClick={verstuur} style={{ flex: 1, padding: "16px 0", borderRadius: 16, border: "none", background: "linear-gradient(to right, #7c3aed, #ec4899)", color: "white", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              Versturen ✓
            </button>
          </div>
        </div>
      )}

      {stap === "verzenden" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", border: "4px solid #a78bfa", borderTopColor: "#7c3aed", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "white", fontSize: 18, fontWeight: 600 }}>Foto versturen…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {stap === "klaar" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 80 }}>✅</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "white" }}>Foto verstuurd!</h1>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>De foto is ontvangen op je computer. Je kunt dit scherm sluiten.</p>
          <button onClick={opnieuw} style={{ marginTop: 16, width: "100%", padding: "16px 0", borderRadius: 16, border: "2px solid #475569", background: "transparent", color: "#94a3b8", fontWeight: 600, cursor: "pointer" }}>
            Nog een foto sturen
          </button>
        </div>
      )}

      {stap === "fout" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 80 }}>❌</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "white" }}>Er ging iets mis</h1>
          <p style={{ fontSize: 14, color: "#94a3b8" }}>{foutmelding}</p>
          <button onClick={opnieuw} style={{ width: "100%", padding: "16px 0", borderRadius: 16, border: "none", background: "linear-gradient(to right, #7c3aed, #ec4899)", color: "white", fontWeight: 700, cursor: "pointer" }}>
            Probeer opnieuw
          </button>
        </div>
      )}
    </div>
  );
}
