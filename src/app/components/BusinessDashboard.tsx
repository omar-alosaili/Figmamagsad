import { useState } from "react";
import { ArrowRight, TrendingUp, Bookmark, Eye, Star, Plus, Check, X, ChevronLeft } from "lucide-react";
import { PLACES } from "./data";

type Props = { onBack: () => void };

export function BusinessDashboard({ onBack }: Props) {
  const place = PLACES[1]; // Blue Water - verified
  const [activeTab, setActiveTab] = useState<"overview" | "offers" | "settings">("overview");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDesc, setOfferDesc] = useState("");

  const stats = [
    { label: "مشاهدات هذا الأسبوع", value: "١٢٤٨", trend: "+١٨٪", positive: true },
    { label: "حفظوا المكان", value: "٣٤٢", trend: "+٨٪", positive: true },
    { label: "تقييمات جديدة", value: "٢٧", trend: "-٣٪", positive: false },
    { label: "في قوائم المستخدمين", value: "٨٩", trend: "+٢٤٪", positive: true },
  ];

  const listInsights = [
    { list: "كافيهات للعمل", count: 234 },
    { list: "قهوة مختصة", count: 189 },
    { list: "كافيهات هادئة", count: 143 },
    { list: "ويكند في الرياض", count: 98 },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24" dir="rtl">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
            <ArrowRight size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">لوحة تحكم المكان</h1>
            <p className="text-xs text-muted-foreground">{place.name} · موثق ✓</p>
          </div>
        </div>

        <div className="flex gap-1 bg-muted p-1 rounded-2xl">
          {(["overview", "offers", "settings"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "overview" ? "الإحصائيات" : t === "offers" ? "العروض" : "الإعدادات"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5">
        {activeTab === "overview" && (
          <>
            {/* Place Card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5">
              <img src={place.image} alt={place.name} className="w-full h-36 object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">{place.name}</h2>
                    <p className="text-xs text-muted-foreground">{place.district} · {place.type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold">{place.rating}</span>
                    <span className="text-xs text-muted-foreground">({place.reviewCount})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {stats.map(stat => (
                <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground mb-1 leading-tight">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <div className={`flex items-center gap-1 mt-1 ${stat.positive ? "text-green-600" : "text-red-500"}`}>
                    <TrendingUp size={11} className={stat.positive ? "" : "rotate-180"} />
                    <span className="text-xs font-medium">{stat.trend}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* List Insights */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Bookmark size={14} className="text-accent" />
                القوائم التي أُضيف فيها مكانك
              </h3>
              <div className="flex flex-col gap-2">
                {listInsights.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.list}</span>
                    <span className="text-sm font-semibold text-accent">{item.count} مستخدم</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audience Interest */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Eye size={14} className="text-accent" />
                اهتمامات جمهورك
              </h3>
              <div className="space-y-3">
                {[
                  { label: "قهوة مختصة", pct: 72 },
                  { label: "للعمل والدراسة", pct: 58 },
                  { label: "هادئ ومريح", pct: 45 },
                  { label: "عائلي", pct: 23 },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground">{item.label}</span>
                      <span className="text-muted-foreground">{item.pct}٪</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "offers" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-muted-foreground">العروض الحالية</h2>
              <button
                onClick={() => setShowOfferModal(true)}
                className="flex items-center gap-1.5 bg-accent text-white px-3 py-2 rounded-full text-xs font-semibold"
              >
                <Plus size={13} /> عرض جديد
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold">٢٠٪ على مشروبات الماتشا</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">ينتهي ٢٠ يونيو</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">نشط</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 rounded-xl bg-muted text-foreground text-xs font-medium">تعديل</button>
                <button className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-medium">إيقاف</button>
              </div>
            </div>

            <div className="text-center py-8 text-muted-foreground">
              <p className="text-3xl mb-2">🎁</p>
              <p className="text-sm">أضف عروضاً لجذب المزيد من العملاء</p>
            </div>
          </>
        )}

        {activeTab === "settings" && (
          <div className="flex flex-col gap-3">
            {[
              "تحديث صور المكان",
              "تعديل بيانات المكان",
              "تحديث أوقات العمل",
              "إضافة المنيو",
              "رابط الطلب / الحجز",
              "إعدادات الإشعارات",
            ].map(item => (
              <button
                key={item}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-accent/30 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">{item}</span>
                <ChevronLeft size={16} className="text-muted-foreground rotate-180" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-end" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowOfferModal(false)} />
          <div className="relative w-full bg-card rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">عرض جديد</h3>
              <button onClick={() => setShowOfferModal(false)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">عنوان العرض</label>
                <input
                  type="text"
                  value={offerTitle}
                  onChange={e => setOfferTitle(e.target.value)}
                  placeholder="مثل: ٢٠٪ على كل المشروبات"
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">التفاصيل</label>
                <textarea
                  value={offerDesc}
                  onChange={e => setOfferDesc(e.target.value)}
                  rows={3}
                  placeholder="وصف العرض وشروطه..."
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">تاريخ البداية</label>
                  <input type="date" className="w-full bg-input-background border border-border rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">تاريخ الانتهاء</label>
                  <input type="date" className="w-full bg-input-background border border-border rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <button
                disabled={!offerTitle.trim()}
                onClick={() => setShowOfferModal(false)}
                className="w-full py-3.5 rounded-2xl bg-accent text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check size={16} /> نشر العرض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
