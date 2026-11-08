import { ImageResponse } from "next/og";

export const alt = "JOBLINK — Le travail près de vous";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#14532D", color: "#fff" }}>
        <div style={{ fontSize: 44, fontWeight: 700, display: "flex" }}>JOB<span style={{ color: "#86EFAC" }}>LINK</span></div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>Trouvez du travail. Trouvez les bonnes personnes.</div>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#86EFAC" }}>Près de chez vous.</div>
        </div>
        <div style={{ fontSize: 28, color: "#BBF7D0" }}>Marketplace de missions et services géolocalisés · Bénin</div>
      </div>
    ),
    size,
  );
}
