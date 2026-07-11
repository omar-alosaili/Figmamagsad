import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  getPromotionsForAdmin, updatePromotion, createAdminPromotion, deletePromotion,
  PLACEMENT_LABELS, type AdminPromotion, type PromotionPlacement, type PromotionStatus,
} from "../lib/promotions";
import { getPlaces } from "../lib/places";
import { toast } from "../lib/toast";
import type { Place } from "./data";

type Props = { userId: string; onReload: () => void };

const STATUS_META: Record<PromotionStatus, { label: string; cls: string }> = {
  pending: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700" },
  active: { label: "نشط", cls: "bg-green-100 text-green-700" },
  paused: { label: "متوقف", cls: "bg-muted text-muted-foreground" },
  rejected: { label: "مرفوض", cls: "bg-red-50 text-red-600" },
};

// An 'active' row is only live inside its start/end window — reflect the
// real state users see, not just the stored status.
function pillMeta(p: AdminPromotion): { label: string; cls: string } {
  if (p.status === "active") {
    const now = Date.now();
    if (new Date(p.startsAt).getTime() > now) return { label: "مجدول", cls: "bg-blue-50 text-blue-600" };
    if (p.endsAt && new Date(p.endsAt).getTime() <= now) return { label: "منتهي", cls: "bg-muted text-muted-foreground" };
  }
  return STATUS_META[p.status];
}

const FILTERS = [
  { key: "pending" as const, label: "طلبات جديدة" },
  { key: "active" as const, label: "نشطة" },
  { key: "all" as const, label: "الكل" },
];

// Priority is a Postgres int4 — keep it in a sane, in-range band.
function clampPriority(v: string): number {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1000, n));
}

// A date-only "YYYY-MM-DD" means "through the end of that day" in the
// admin's local time — not UTC midnight (which expires it hours early).
function endOfDayIso(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function AdminPromotions({ userId, onReload }: Props) {
  const [promos, setPromos] = useState<AdminPromotion[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [filter, setFilter] = useState<"pending" | "active" | "all">("pending");
  const [editing, setEditing] = useState<AdminPromotion | null>(null);
  const [showPublish, setShowPublish] = useState(false);

  const load = () => getPromotionsForAdmin().then(setPromos).catch(console.error);
  useEffect(() => { load(); getPlaces().then(setPlaces).catch(console.error); }, []);

  const districts = useMemo(
    () => [...new Set(places.map(p => p.district).filter(Boolean))].sort(),
    [places],
  );

  const shown = promos.filter(p => filter === "all" || p.status === filter);
  const pendingCount = promos.filter(p => p.status === "pending").length;

  const refresh = () => { load(); onReload(); };

  const setStatus = (p: AdminPromotion, status: PromotionStatus) => {
    updatePromotion(userId, p.id, { status }, `${STATUS_META[status].label} · ${p.placeName}`)
      .then(() => {
        refresh();
        toast.success(
          status === "rejected" ? "تم رفض الطلب"
            : status === "paused" ? "تم إيقاف الترويج"
            : "تم تفعيل الترويج",
        );
      })
      .catch(() => toast.error(
        status === "rejected" ? "تعذّر رفض الطلب — حاول مجدداً"
          : status === "paused" ? "تعذّر إيقاف الترويج — حاول مجدداً"
          : "تعذّر تفعيل الترويج — حاول مجدداً",
      ));
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-muted-foreground">الترويج والاكتشاف</h2>
        <button onClick={() => setShowPublish(true)} className="text-xs font-semibold text-accent">نشر مكان +</button>
      </div>

      <div className="flex gap-1.5 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}{f.key === "pending" && pendingCount > 0 ? ` (${pendingCount.toLocaleString("ar")})` : ""}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm">لا عناصر في هذا القسم</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">{p.placeName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {PLACEMENT_LABELS[p.placement]} · أولوية {p.priority.toLocaleString("ar")}
                    {p.targetDistrict ? ` · ${p.targetDistrict}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.requesterName ? `طلب من ${p.requesterName}` : "نشر إداري"}
                  </p>
                </div>
                {(() => { const m = pillMeta(p); return (
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>
                ); })()}
              </div>

              {p.note && <p className="text-xs text-foreground bg-muted rounded-xl px-3 py-2 mt-2">{p.note}</p>}

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {p.status === "pending" && (
                  <>
                    <button onClick={() => setStatus(p, "active")} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
                      موافقة ونشر
                    </button>
                    <button onClick={() => setStatus(p, "rejected")} className="px-3 py-1.5 rounded-xl bg-muted text-foreground text-xs font-semibold">
                      رفض
                    </button>
                  </>
                )}
                {p.status === "active" && (
                  <button onClick={() => setStatus(p, "paused")} className="px-3 py-1.5 rounded-xl bg-muted text-foreground text-xs font-semibold">
                    إيقاف
                  </button>
                )}
                {p.status === "paused" && (
                  <button onClick={() => setStatus(p, "active")} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
                    تفعيل
                  </button>
                )}
                <button onClick={() => setEditing(p)} className="px-3 py-1.5 rounded-xl border border-border text-foreground text-xs font-semibold">
                  ضبط
                </button>
                <button
                  onClick={() => { if (window.confirm(`حذف ترويج «${p.placeName}»؟`)) deletePromotion(userId, p.id, `حذف ترويج · ${p.placeName}`).then(() => { refresh(); toast.success("تم حذف الترويج"); }).catch(() => toast.error("تعذّر حذف الترويج — حاول مجدداً")); }}
                  className="px-3 py-1.5 rounded-xl text-destructive text-xs font-semibold"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ConfigModal
          promo={editing}
          districts={districts}
          onClose={() => setEditing(null)}
          onSave={(config, detail) => {
            updatePromotion(userId, editing.id, config, detail).then(() => { setEditing(null); refresh(); toast.success("تم حفظ الإعدادات"); }).catch(() => toast.error("تعذّر حفظ الإعدادات — حاول مجدداً"));
          }}
        />
      )}

      {showPublish && (
        <PublishModal
          places={places}
          districts={districts}
          existing={new Set(promos.filter(p => p.status === "active").map(p => p.placeId + p.placement))}
          onClose={() => setShowPublish(false)}
          onPublish={(input) => {
            createAdminPromotion(userId, input).then(() => { setShowPublish(false); refresh(); toast.success("تم نشر المكان في الاكتشاف"); }).catch(() => toast.error("تعذّر نشر المكان — حاول مجدداً"));
          }}
        />
      )}
    </div>
  );
}

// ---- Configure an existing promotion ----
function ConfigModal({ promo, districts, onClose, onSave }: {
  promo: AdminPromotion;
  districts: string[];
  onClose: () => void;
  onSave: (config: { placement: PromotionPlacement; priority: number; targetDistrict: string | null; endsAt: string | null }, detail: string) => void;
}) {
  const [placement, setPlacement] = useState<PromotionPlacement>(promo.placement);
  const [priority, setPriority] = useState(String(promo.priority));
  const [district, setDistrict] = useState(promo.targetDistrict ?? "");
  const [endsAt, setEndsAt] = useState(promo.endsAt ? promo.endsAt.slice(0, 10) : "");

  return (
    <div className="absolute inset-0 z-50 flex items-end" dir="rtl">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-card rounded-t-3xl p-6 max-h-[88vh] overflow-y-auto">
        <h3 className="text-base font-bold mb-5">ضبط الترويج — {promo.placeName}</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">القسم (المكان في التطبيق)</label>
            <div className="flex flex-col gap-2">
              {(Object.keys(PLACEMENT_LABELS) as PromotionPlacement[]).map(pl => (
                <button key={pl} onClick={() => setPlacement(pl)}
                  className={`w-full text-right px-4 py-2.5 rounded-2xl border text-sm ${placement === pl ? "bg-primary text-primary-foreground border-primary" : "bg-input-background border-border"}`}>
                  {PLACEMENT_LABELS[pl]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">الأولوية (الأعلى يظهر أولاً)</label>
            <input type="number" value={priority} onChange={e => setPriority(e.target.value)}
              className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">الحي المستهدف (اختياري)</label>
            <select value={district} onChange={e => setDistrict(e.target.value)}
              className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
              <option value="">كل الأحياء</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">تاريخ الانتهاء (اختياري)</label>
            <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)}
              className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <button
            onClick={() => onSave(
              { placement, priority: clampPriority(priority), targetDistrict: district || null, endsAt: endOfDayIso(endsAt) },
              `ضبط ترويج · ${promo.placeName}`,
            )}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            حفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Admin publishes a place directly ----
function PublishModal({ places, districts, existing, onClose, onPublish }: {
  places: Place[];
  districts: string[];
  existing: Set<string>;
  onClose: () => void;
  onPublish: (input: { placeId: string; placeName: string; placement: PromotionPlacement; priority: number; targetDistrict: string | null }) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Place | null>(null);
  const [placement, setPlacement] = useState<PromotionPlacement>("home_new");
  const [priority, setPriority] = useState("0");
  const [district, setDistrict] = useState("");

  const matches = query.trim()
    ? places.filter(p => p.name.includes(query.trim()) || p.district.includes(query.trim())).slice(0, 8)
    : [];
  const duplicate = selected ? existing.has(selected.id + placement) : false;

  return (
    <div className="absolute inset-0 z-50 flex items-end" dir="rtl">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-card rounded-t-3xl p-6 max-h-[88vh] overflow-y-auto">
        <h3 className="text-base font-bold mb-5">نشر مكان في الاكتشاف</h3>
        <div className="flex flex-col gap-4">
          {!selected ? (
            <div>
              <div className="relative">
                <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن مكان..."
                  className="w-full bg-input-background border border-border rounded-2xl pr-11 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div className="flex flex-col gap-1 mt-2">
                {matches.map(p => (
                  <button key={p.id} onClick={() => setSelected(p)} className="text-right px-3 py-2 rounded-xl hover:bg-muted text-sm">
                    {p.name} <span className="text-xs text-muted-foreground">· {p.district}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-muted rounded-2xl px-4 py-3">
                <span className="text-sm font-semibold">{selected.name} · {selected.district}</span>
                <button onClick={() => setSelected(null)} className="text-xs text-accent">تغيير</button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">القسم</label>
                <div className="flex flex-col gap-2">
                  {(Object.keys(PLACEMENT_LABELS) as PromotionPlacement[]).map(pl => (
                    <button key={pl} onClick={() => setPlacement(pl)}
                      className={`w-full text-right px-4 py-2.5 rounded-2xl border text-sm ${placement === pl ? "bg-primary text-primary-foreground border-primary" : "bg-input-background border-border"}`}>
                      {PLACEMENT_LABELS[pl]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الأولوية</label>
                <input type="number" value={priority} onChange={e => setPriority(e.target.value)}
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الحي المستهدف (اختياري)</label>
                <select value={district} onChange={e => setDistrict(e.target.value)}
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
                  <option value="">كل الأحياء</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {duplicate && <p className="text-xs text-destructive text-center">هذا المكان منشور بالفعل في هذا القسم</p>}
              <button
                onClick={() => onPublish({ placeId: selected.id, placeName: selected.name, placement, priority: clampPriority(priority), targetDistrict: district || null })}
                disabled={duplicate}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                نشر فوراً
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
