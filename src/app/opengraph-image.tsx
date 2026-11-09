import { ImageResponse } from "next/og";

export const alt = "JOBLINK — Le travail près de vous";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTMyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InAiIHgxPSIyMCUiIHkxPSIwJSIgeDI9IjgwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzRBREU4MCIvPjxzdG9wIG9mZnNldD0iLjQ1IiBzdG9wLWNvbG9yPSIjMTZBMzRBIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMTQ1MzJEIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9Im8iIHgxPSIwJSIgeTE9IjEwMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzE2QTM0QSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzg2RUZBQyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik01OCA4Yy0yNC4zIDAtNDQgMTkuNy00NCA0NCAwIDE3LjUgMTAuMyAzMi4zIDI0LjYgNDEuOUw1OCAxMjRsMTkuNC0zMC4xQzkxLjcgODQuMyAxMDIgNjkuNSAxMDIgNTIgMTAyIDI3LjcgODIuMyA4IDU4IDhaIiBmaWxsPSJ1cmwoI3ApIi8+PGNpcmNsZSBjeD0iNTgiIGN5PSI1MiIgcj0iMjkiIGZpbGw9IiNmZmYiLz48ZyBmaWxsPSIjMTQ1MzJEIj48Y2lyY2xlIGN4PSI0Mi41IiBjeT0iNDciIHI9IjUuMiIvPjxwYXRoIGQ9Ik0zMyA3MGMwLTcuMiA0LjMtMTIuNSA5LjUtMTIuNVM1MiA2Mi44IDUyIDcwdjJIMzN6Ii8+PGNpcmNsZSBjeD0iNzMuNSIgY3k9IjQ3IiByPSI1LjIiLz48cGF0aCBkPSJNNjQgNzBjMC03LjIgNC4zLTEyLjUgOS41LTEyLjVTODMgNjIuOCA4MyA3MHYySDY0eiIvPjwvZz48ZyBmaWxsPSIjMTZBMzRBIj48Y2lyY2xlIGN4PSI1OCIgY3k9IjQ0IiByPSI2LjIiLz48cGF0aCBkPSJNNTAuNiA0MS4yYzAtNC44IDMuMy04LjIgNy40LTguMnM3LjQgMy40IDcuNCA4LjJoMS44djIuM0g0OC44di0yLjN6Ii8+PHBhdGggZD0iTTQ2LjUgNzJjMC05IDUuMi0xNS4yIDExLjUtMTUuMlM2OS41IDYzIDY5LjUgNzJ2MmgtMjN6Ii8+PC9nPjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU4IDYyKSByb3RhdGUoLTI0KSIgZD0iTS02MCAwQTYwIDIwIDAgMCAwIDYwIDBBNjAgMTIgMCAwIDEgLTYwIDBaIiBmaWxsPSJ1cmwoI28pIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgcGFpbnQtb3JkZXI9InN0cm9rZSIvPjwvc3ZnPgo=";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 80, background: "linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 55%, #DCFCE7 100%)", color: "#111827" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div style={{ fontSize: 44, fontWeight: 800, display: "flex", color: "#14532D" }}>JOB<span style={{ color: "#16A34A" }}>LINK</span></div>
          <div style={{ marginTop: 48, fontSize: 62, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }}>Trouvez du travail. Trouvez les bonnes personnes.</div>
          <div style={{ fontSize: 62, fontWeight: 800, color: "#16A34A", letterSpacing: -2 }}>Près de chez vous.</div>
          <div style={{ marginTop: 40, fontSize: 26, color: "#6B7280" }}>Missions et services géolocalisés · Bénin</div>
        </div>
        <img src={MARK} width={300} height={330} alt="" />
      </div>
    ),
    size,
  );
}
