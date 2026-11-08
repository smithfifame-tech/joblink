"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 16 }}>
          <h1>JOBLINK est momentanément indisponible</h1>
          <p>Réessayez dans un instant.</p>
          <button onClick={reset} style={{ background: "#16A34A", color: "#fff", border: 0, borderRadius: 8, padding: "10px 16px" }}>Réessayer</button>
        </div>
      </body>
    </html>
  );
}
