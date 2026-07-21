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
  // Post-login gate offers an escape hatch; onboarding doesn't need one.
  onLogout?: () => void;
};

// Mandatory username picker. Usernames are the search/share identity
// (?u= deep links, Explore user search), so every account must have one:
// new accounts pass through here during onboarding, and accounts created
// before usernames were required are gated here on their next login.
export function UsernameGate({ onDone, withProgress = false, onLogout }: Props) {
  const [uid, setUid] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid" | "error">("idle");
  const [saving, setSaving] = useState(false);
  // Accounts created through the old auto-signup login path have no name —
  // collect it here alongside the username when it's missing.
  const [needName, setNeedName] = useState(false);
  const [hasUsername, setHasUsername] = useState(false);
  const [name, setName] = useState("");

  // An account that already has BOTH a username and a name (e.g. an
  // existing user who re-entered via the Register path) must pass straight
  // through — and must never silently overwrite what it has.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser()
      .then(({ data }) => {
        const id = data.user?.id ?? null;
        if (cancelled) return;
        setUid(id);
        if (!id) return;
        return supabase.from("profiles").select("username, name").eq("id", id).maybeSingle()
          .then(({ data: row }) => {
            if (cancelled || !row) return;
            const missingName = !(row.name ?? "").trim();
            if (row.username && !missingName) { onDone(); return; }
            setHasUsername(!!row.username);
            setNeedName(missingName);
          });
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, []);

  // Debounced live availability check. `stale` also cancels the RESPONSE,
  // not just the timer — a slow reply for the previous input must not
  // overwrite the verdict for what's typed now.
  useEffect(() => {
    if (hasUsername) { setStatus("ok"); return; } // only the name is missing
    const uname = username.trim().toLowerCase();
    if (!uname) { setStatus("idle"); return; }
    if (!USERNAME_RE.test(uname)) { setStatus("invalid"); return; }
    setStatus("checking");
    let stale = false;
    const t = setTimeout(() => {
      isUsernameAvailable(uname, uid ?? "")
        .then(free => { if (!stale) setStatus(free ? "ok" : "taken"); })
        .catch(() => { if (!stale) setStatus("error"); });
    }, 350);
    return () => { stale = true; clearTimeout(t); };
  }, [username, uid, hasUsername]);

  const save = async () => {
    const uname = username.trim().toLowerCase();
    if (status !== "ok" || saving) return;
    setSaving(true);
    // uid can be null if the one-shot getUser failed on mount — retry here
    // instead of leaving the button dead forever.
    let id = uid;
    if (!id) {
      const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      id = data.user?.id ?? null;
      setUid(id);
      if (!id) { setSaving(false); toast.error("تعذّر الاتصال — حاول مجدداً"); return; }
    }
    const patch: { username?: string; name?: string } = {};
    if (!hasUsername) patch.username = uname;
    if (needName) patch.name = name.trim();
    updateProfile(id, patch)
      .then(onDone)
      .catch((e: { code?: string }) => {
        setSaving(false);
        // 23505 = someone grabbed it between the check and the save
        if (e?.code === "23505") { setStatus("taken"); return; }
        toast.error("تعذّر حفظ الملف — حاول مجدداً");
      });
  };

  const canSave = status === "ok" && (!needName || !!name.trim());

  const hint =
    status === "taken" ? { text: "هذا الاسم محجوز — جرّب غيره", cls: "text-destructive" } :
    status === "invalid" ? { text: "٣–٢٠ خانة: أحرف إنجليزية صغيرة وأرقام و _ فقط", cls: "text-destructive" } :
    status === "checking" ? { text: "جارٍ التحقق من التوفر…", cls: "text-muted-foreground" } :
    status === "error" ? { text: "تعذّر التحقق — تأكد من اتصالك", cls: "text-destructive" } :
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
          <h1 className="text-2xl font-bold text-foreground mb-1">{hasUsername ? "أكمل ملفك الشخصي" : "اختر اسم المستخدم"}</h1>
          <p className="text-sm text-muted-foreground">{hasUsername ? "بقي اسمك فقط — حتى يعرفك أصدقاؤك" : "حتى يسهل على أصدقائك إيجادك ومتابعتك"}</p>
        </motion.div>
      </div>

      <div className="flex-1 px-5 flex flex-col gap-4">
        {needName && (
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">اسمك</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثل: عمر عبدالعزيز"
              aria-label="الاسم"
              maxLength={60}
              className="w-full bg-input-background border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        )}
        {!hasUsername && (
          <div>
            <div className="flex items-center bg-input-background border border-border rounded-2xl px-4 focus-within:ring-2 focus-within:ring-accent/30" style={{ direction: "ltr" }}>
              <AtSign size={16} className="text-muted-foreground flex-shrink-0" />
              <input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                placeholder="omar_riyadh"
                aria-label="اسم المستخدم"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={20}
                className="flex-1 bg-transparent py-3.5 px-2 text-sm text-foreground focus:outline-none"
              />
              {status === "ok" && <Check size={16} className="text-success flex-shrink-0" />}
            </div>
            <p role="status" aria-live="polite" className={`text-xs mt-2 ${hint.cls}`}>{hint.text}</p>
          </div>
        )}
      </div>

      <div className="px-5 pb-10 flex-shrink-0">
        <Button fullWidth onClick={save} loading={saving} disabled={!canSave || saving}>
          متابعة ←
        </Button>
        {onLogout && (
          <button onClick={onLogout} className="w-full mt-3 text-xs text-muted-foreground py-1">
            تسجيل الخروج
          </button>
        )}
      </div>
    </div>
  );
}
