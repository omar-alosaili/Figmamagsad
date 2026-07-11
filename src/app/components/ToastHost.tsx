import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, AlertCircle, Info, X } from "lucide-react";
import { subscribeToasts, dismissToast, type Toast, type ToastKind } from "../lib/toast";

const ICON: Record<ToastKind, JSX.Element> = {
  success: <Check size={15} className="text-green-400" />,
  error: <AlertCircle size={15} className="text-red-400" />,
  info: <Info size={15} className="text-accent" />,
};

// Rendered once at the app root. Sits above the tab bar, inside the phone
// frame. Errors announce assertively; success/info politely.
export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div
      className="absolute bottom-24 inset-x-0 z-[60] flex flex-col items-center gap-2 px-5 pointer-events-none"
      dir="rtl"
    >
      <AnimatePresence>
        {items.map(t => (
          <motion.div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            aria-live={t.kind === "error" ? "assertive" : "polite"}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={() => dismissToast(t.id)}
            className="pointer-events-auto w-full max-w-sm flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl shadow-xl px-4 py-3 cursor-pointer"
          >
            <span className="flex-shrink-0">{ICON[t.kind]}</span>
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            <X size={14} className="flex-shrink-0 opacity-50" aria-hidden="true" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
