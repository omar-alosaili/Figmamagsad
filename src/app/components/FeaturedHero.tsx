import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bookmark } from "lucide-react";
import { tappable } from "../lib/a11y";
import type { Place } from "./data";

type Props = {
  places: Place[]; // admin-featured, priority-ordered
  savedPlaces: Set<string>;
  onSave: (id: string) => void;
  onPlaceClick: (id: string) => void;
};

// The home "وين مقصدك اليوم؟" hero — an admin-curated showcase of specific
// places (fed by the promotions "نشر مكان" flow). One place shows as a
// static hero; several auto-rotate as a swipeable carousel with dots.
export function FeaturedHero({ places, savedPlaces, onSave, onPlaceClick }: Props) {
  const count = places.length;
  const [idx, setIdx] = useState(0);
  const active = count > 0 ? places[idx % count] : null;

  // Auto-advance a multi-place showcase. Reset the timer whenever the index
  // changes (manual nav) so a tap doesn't get cut short.
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count, idx]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="px-5 mb-8"
    >
      <div
        className="relative h-56 rounded-3xl overflow-hidden cursor-pointer"
        {...tappable(() => onPlaceClick(active.id), active.name)}
      >
        <AnimatePresence>
          <motion.img
            key={active.id}
            src={active.image}
            alt={active.name}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        <div className="absolute top-4 right-4">
          <span className="bg-accent text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg">
            ⭐ مميز هذا الأسبوع
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onSave(active.id); }}
          aria-label={`حفظ ${active.name}`}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
        >
          <Bookmark size={16} className={savedPlaces.has(active.id) ? "fill-accent text-accent" : "text-foreground"} />
        </button>

        <div className="absolute bottom-4 right-4 left-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-white text-xl font-bold truncate">{active.name}</h2>
              <p className="text-white/70 text-sm mt-1">
                {active.district}{active.googleRating ? ` · ★ ${active.googleRating}` : ""}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onPlaceClick(active.id); }}
              className="flex-shrink-0 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl px-3 py-1.5 hover:bg-white/30 transition-colors"
            >
              <span className="text-white text-xs font-semibold">اكتشف ←</span>
            </button>
          </div>

          {count > 1 && (
            <div className="flex items-center gap-1.5 mt-3">
              {places.map((p, i) => (
                <button
                  key={p.id}
                  onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                  aria-label={`المكان ${i + 1} من ${count}`}
                  aria-current={i === idx % count}
                  className={`h-1.5 rounded-full transition-all ${i === idx % count ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
