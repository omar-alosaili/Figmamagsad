import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { configError } from "./app/lib/supabase";
import "./styles/index.css";

// Readable fallback for a misconfigured deploy (missing env vars) instead
// of a silent white screen. This is an ops-facing message.
function ConfigError({ missing }: { missing: string[] }) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#FAF7F2", color: "#1C0F08", fontFamily: "'Noto Kufi Arabic', system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>التطبيق غير مُهيّأ</h1>
        <p style={{ fontSize: 14, color: "#6E574C", margin: "0 0 16px", lineHeight: 1.6 }}>
          لم يتم ضبط متغيّرات البيئة المطلوبة في بيئة النشر. أضِف المتغيّرات التالية ثم أعِد النشر:
        </p>
        <div
          style={{
            fontFamily: "ui-monospace, monospace", fontSize: 13, textAlign: "left", direction: "ltr",
            background: "#FFFFFF", border: "1px solid rgba(44,24,16,0.12)", borderRadius: 12,
            padding: "12px 14px", color: "#DC2626",
          }}
        >
          {missing.map(v => <div key={v}>{v}</div>)}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  configError ? <ConfigError missing={configError} /> : <App />,
);
