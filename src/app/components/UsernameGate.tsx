import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AtSign, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { updateProfile, isUsernameAvailable, USERNAME_RE } from "../lib/profile";
import { toast } from "../lib/toast";
import { Button } from "./Button";

type Props = {
  onDone: () => void;
  // Onboarding embeds the gate as step 4 of 5 and shows the progress bar;
  // the post-login gate for pre-existing accounts shows none.
  withProgress?: boolean;
};

// Mandatory username picker. Usernames are the search/share identity
// (?u= deep links, Explore user search), so every account must have one:
// new accounts pass through here during onboarding, and accounts created
// before usernames were required are gated here on their next login.
export function UsernameGate({ onDone, withProgress = false }: Props) {
  const [uid, setUid] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)).catch(console.error);
  }, []);

  // Debounced live availability check. `stale` also cancels the RESPONSE,
  // not just the timer — a slow reply for the previous input must not
  // overwrite the verdict for what's typed now.
  useEffect(() => {
    const uname = username.trim().toLowerCase();
    if (!uname) { setStatus("idle"); return; }
    if (!USERNAME_RE.test(uname)) { setStatus("invalid"); return; }
    setStatus("checking");
    let stale = false;
    const t = setTimeout(() => {
      isUsernameAvailable(uname, uid ?? "")
        .then(free => { if (!stale) setStatus(free ? "ok" : "taken"); })
        .catch(() => { if (!stale) setStatus("idle"); });
    }, 350);
    return () => { stale = true; clearTimeout(t); };
  }, [username, uid]);

  const save = () => {
    const uname = username.trim().toLowerCase();
    if (!uid || status !== "ok" || saving) return;
    setSaving(true);
    updateProfile(uid, { username: uname })
      .then(onDone)
      .catch((e: { code?: string }) => {
        setSaving(false);
        // 23505 = someone grabbed it between the check and the save
        if (e?.code === "23505") { setStatus("taken"); return; }
        toast.error("تعذّر حفظ اسم المستخدم — حاول مجدداً");
      });
  };

  const hint =
    status === "taken" ? { text: "هذا الاسم محجوز — جرّب غيره", cls: "text-destructive" } :
    status === "invalid" ? { text: "٣–٢٠ خانة: أحرف إنجليزية صغيرة وأرقام و _ فقط", cls: "text-destructive" } :
    status === "ok" ? { text: "متاح ✓", cls: "text-success" } :
    { text: "معرّفك الفريد — يظهر في ملفك وروابط المشاركة", cls: "text-muted-foreground" };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden" dir="rtl">
      <div className="px-5 pt-14 pb-4 flex-shrink-0">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          {withProgress && (
            <div className="flex items-center gap-1.5 mb-5">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i === 3 ? "var(--accent)" : "var(--muted)" }} />
              ))}
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground mb-1">اختر اسم المستخدم</h1>
          <p className="text-sm text-muted-foreground">حتى يسهل على أصدقائك إيجادك ومتابعتك</p>
        </motion.div>
      </div>

      <div className="flex-1 px-5">
        <div className="flex items-center bg-input-background border border-border rounded-2xl px-4 focus-within:ring-2 focus-within:ring-accent/30" style={{ direction: "ltr" }}>
          <AtSign size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase())}
            placeholder="omar_riyadh"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="flex-1 bg-transparent py-3.5 px-2 text-sm text-foreground focus:outline-none"
          />
          {status === "ok" && <Check size={16} className="text-success flex-shrink-0" />}
        </div>
        <p className={`text-xs mt-2 ${hint.cls}`}>{hint.text}</p>
      </div>

      <div className="px-5 pb-10 flex-shrink-0">
        <Button fullWidth onClick={save} loading={saving} disabled={status !== "ok" || saving || !uid}>
          متابعة ←
        </Button>
      </div>
    </div>
  );
}
