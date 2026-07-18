import { useEffect, useState } from "react";
import { ArrowRight, Plus, Check, X, Shield, Flag, Tag, Users, Star, Search, Store, Crown, Coins } from "lucide-react";
import type { Place } from "./data";
import { getPlaces, createPlace, updatePlace, deletePlace } from "../lib/places";
import { FEATURES } from "../lib/features";
import { PLACE_IMAGE_FALLBACK } from "../lib/types";
import { AdminAnalytics } from "./AdminAnalytics";
import { AdminPromotions } from "./AdminPromotions";
import { Button } from "./Button";
import { toast } from "../lib/toast";
import {
  getOverviewStats, getVerificationRequests, reviewVerificationRequest,
  getReports, resolveReport, deleteReportedReview, getAuditLog, logAdminAction,
  getPayoutRequests, markPayoutPaid,
  searchUsers, setUserCreator, setUserRole, assignPlaceOwnership, getMonetizationStats,
  sendBroadcast, type BroadcastSegment,
  type VerificationRequest, type Report, type AuditLogEntry, type AdminPayoutRequest,
  type AdminUser, type MonetizationStats,
} from "../lib/admin";

type Props = { userId: string; onBack: () => void };

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop&auto=format";

const ACTION_LABELS: Record<string, string> = {
  verify_approve: "تم قبول توثيق",
  verify_reject: "تم رفض توثيق",
  report_resolve: "تم حل بلاغ",
  report_dismiss: "تم تجاهل بلاغ",
  place_create: "تم إضافة مكان جديد",
  place_update: "تم تعديل مكان",
  place_delete: "تم حذف مكان",
  payout_paid: "تم تحويل دفعة لمتميز",
  user_update: "تحديث صلاحيات مستخدم",
  broadcast_sent: "تم إرسال إشعار جماعي",
  promotion_update: "تحديث ترويج",
};

const ADMIN_LIST_PAGE = 30;

// Quick-toggle curation flags shown on each place row. These are the
// editorial fields the Google sync never touches (except the Google-
// sourced family/kids/outdoor facts it seeds; admins can override).
const CURATION_FLAGS = [
  { key: "isWorkFriendly" as const,   db: "is_work_friendly" as const,   label: "💻 للعمل" },
  { key: "isFamilyFriendly" as const, db: "is_family_friendly" as const, label: "👨‍👩‍👧 عائلي" },
  { key: "isKidsFriendly" as const,   db: "is_kids_friendly" as const,   label: "👶 أطفال" },
  { key: "hasOutdoorSeating" as const, db: "has_outdoor_seating" as const, label: "🌿 خارجي" },
  { key: "hasParking" as const,       db: "has_parking" as const,        label: "🅿️ موقف" },
];

// Curation work-queues: surface the places that still need editorial
// attention, most-reviewed first so popular places get curated first.
const CURATION_QUEUES = [
  { key: "all" as const,         label: "الكل" },
  { key: "no_category" as const, label: "بدون تصنيف" },
  { key: "no_flags" as const,    label: "بدون مميزات" },
  { key: "no_photo" as const,    label: "بدون صور" },
];
type CurationQueue = typeof CURATION_QUEUES[number]["key"];

function inQueue(p: Place, q: CurationQueue): boolean {
  switch (q) {
    case "no_category": return !p.category.trim();
    case "no_flags":    return !p.isWorkFriendly && !p.isFamilyFriendly && !p.isKidsFriendly && !p.hasOutdoorSeating && !p.hasParking;
    case "no_photo":    return p.image === PLACE_IMAGE_FALLBACK;
    default:            return true;
  }
}

// Audit log action-type filters
const AUDIT_FILTERS = [
  { key: "all",    label: "الكل" },
  { key: "place",  label: "الأماكن" },
  { key: "user",   label: "المستخدمون" },
  { key: "verify", label: "التوثيق" },
  { key: "report", label: "البلاغات" },
] as const;

export function AdminPanel({ userId, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "places" | "users" | "verify" | "reports" | "payouts" | "broadcast" | "analytics" | "promotions">("overview");
  const [payoutRequests, setPayoutRequests] = useState<AdminPayoutRequest[]>([]);
  const [monetization, setMonetization] = useState<MonetizationStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeListLimit, setPlaceListLimit] = useState(ADMIN_LIST_PAGE);
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);
  const [assignQuery, setAssignQuery] = useState("");
  const [curationQueue, setCurationQueue] = useState<CurationQueue>("all");
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [bcTitle, setBcTitle] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcSegment, setBcSegment] = useState<BroadcastSegment>("all");
  const [bcSending, setBcSending] = useState(false);
  const [bcResult, setBcResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [stats, setStats] = useState({ places: 0, users: 0, pendingVerifications: 0, openReports: 0 });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [verifyRequests, setVerifyRequests] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"كافيه" | "مطعم">("كافيه");
  const [newDistrict, setNewDistrict] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLat, setNewLat] = useState("24.7136");
  const [newLng, setNewLng] = useState("46.6753");

  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [editName, setEditName] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const loadOverview = (expanded = false) => {
    getOverviewStats().then(setStats).catch(console.error);
    getAuditLog(expanded ? 100 : 6).then(setAuditLog).catch(console.error);
  };
  const loadPlaces = () => getPlaces(true).then(setPlaces).catch(console.error);
  const loadVerify = () => getVerificationRequests().then(setVerifyRequests).catch(console.error);
  const loadReports = () => getReports().then(setReports).catch(console.error);
  const loadPayouts = () => getPayoutRequests().then(setPayoutRequests).catch(console.error);
  const loadMonetization = () => getMonetizationStats().then(setMonetization).catch(console.error);
  const loadUsers = (q: string) => searchUsers(q).then(setUsers).catch(console.error);

  useEffect(() => {
    loadOverview();
    loadPlaces();
    loadVerify();
    loadReports();
    loadPayouts();
    loadMonetization();
  }, []);

  // Debounced user search
  useEffect(() => {
    const t = setTimeout(() => loadUsers(userQuery), 300);
    return () => clearTimeout(t);
  }, [userQuery]);

  // Reset places pagination when the filter changes
  useEffect(() => { setPlaceListLimit(ADMIN_LIST_PAGE); }, [placeQuery, curationQueue]);

  const handleMarkPayoutPaid = (id: string) => {
    if (!window.confirm("تأكيد: تم تحويل المبلغ للمتميز؟")) return;
    markPayoutPaid(id, userId).then(() => { loadPayouts(); loadOverview(); loadMonetization(); toast.success("تم تسجيل تحويل الدفعة ✓"); }).catch(() => toast.error("تعذّر تسجيل التحويل — حاول مجدداً"));
  };

  const handleToggleCreator = (u: AdminUser) => {
    setUserCreator(u.id, !u.isCreator, userId, u.name)
      .then(() => { loadUsers(userQuery); loadOverview(); loadMonetization(); toast.success(u.isCreator ? "تم سحب صلاحية المتميز ✓" : "تم منح صلاحية المتميز ✓"); })
      .catch(() => toast.error("تعذّر تحديث صلاحية المتميز — حاول مجدداً"));
  };

  const handleToggleAdmin = (u: AdminUser) => {
    const promote = u.role !== "admin";
    if (!window.confirm(promote ? `ترقية ${u.name} لمشرف؟` : `إزالة صلاحية المشرف من ${u.name}؟`)) return;
    setUserRole(u.id, promote ? "admin" : "user", userId, u.name)
      .then(() => { loadUsers(userQuery); loadOverview(); toast.success(promote ? "تمت الترقية لمشرف ✓" : "تم سحب صلاحية المشرف ✓"); })
      .catch(() => toast.error("تعذّر تحديث الصلاحية — حاول مجدداً"));
  };

  const handleAssignPlace = (place: Place | null) => {
    if (!assignTarget) return;
    assignPlaceOwnership(
      assignTarget.id,
      place ? { id: place.id, name: place.name } : null,
      assignTarget.ownedPlaceId,
      userId,
      assignTarget.name,
    )
      .then(() => { setAssignTarget(null); setAssignQuery(""); loadUsers(userQuery); loadOverview(); toast.success("تم تعيين المكان ✓"); })
      .catch(() => toast.error("تعذّر تعيين المكان — حاول مجدداً"));
  };

  // Optimistic curation toggle — reverts by reloading on failure.
  // Deliberately not audit-logged: bulk curation would drown the log.
  const toggleCuration = (place: Place, key: typeof CURATION_FLAGS[number]["key"], db: typeof CURATION_FLAGS[number]["db"]) => {
    const next = !place[key];
    setPlaces(prev => prev.map(p => (p.id === place.id ? { ...p, [key]: next } : p)));
    updatePlace(place.id, { [db]: next }).catch(() => { loadPlaces(); toast.error("تعذّر تحديث المميزات — حاول مجدداً"); });
  };

  const handleRemoveOwnership = (u: AdminUser) => {
    if (!window.confirm(`إزالة ملكية ${u.ownedPlaceName ?? "المكان"} من ${u.name}؟`)) return;
    assignPlaceOwnership(u.id, null, u.ownedPlaceId, userId, u.name)
      .then(() => { loadUsers(userQuery); loadOverview(); toast.success("تم إزالة الملكية ✓"); })
      .catch(() => toast.error("تعذّر إزالة الملكية — حاول مجدداً"));
  };

  const handleSendBroadcast = () => {
    if (!bcTitle.trim() || !bcBody.trim()) return;
    if (!window.confirm(`إرسال الإشعار "${bcTitle}"؟`)) return;
    setBcSending(true);
    setBcResult(null);
    sendBroadcast(userId, { title: bcTitle.trim(), body: bcBody.trim(), segment: bcSegment })
      .then(count => {
        setBcResult({ ok: true, text: `تم الإرسال إلى ${count.toLocaleString("en-US")} مستخدم ✓` });
        setBcTitle("");
        setBcBody("");
        loadOverview(auditExpanded);
      })
      .catch(e => { console.error(e); setBcResult({ ok: false, text: "تعذر الإرسال — حاول مرة أخرى" }); })
      .finally(() => setBcSending(false));
  };

  const statCards = [
    { label: "إجمالي الأماكن", value: stats.places.toLocaleString("en-US"), icon: <Tag size={18} className="text-accent" /> },
    { label: "المستخدمون", value: stats.users.toLocaleString("en-US"), icon: <Users size={18} className="text-accent" /> },
    { label: "طلبات توثيق", value: stats.pendingVerifications.toLocaleString("en-US"), icon: <Shield size={18} className="text-warning" /> },
    { label: "بلاغات معلقة", value: stats.openReports.toLocaleString("en-US"), icon: <Flag size={18} className="text-red-500" /> },
  ];

  const submitNewPlace = () => {
    if (!newName.trim() || !newDistrict.trim()) return;
    createPlace({
      name: newName, type: newType, district: newDistrict, address: newAddress,
      description: newDescription, image: PLACEHOLDER_IMAGE,
      latitude: parseFloat(newLat) || 24.7136, longitude: parseFloat(newLng) || 46.6753,
    }).then(async place => {
      await logAdminAction(userId, "place_create", "places", place.id, place.name);
      setShowAddPlaceModal(false);
      setNewName(""); setNewDistrict(""); setNewAddress(""); setNewDescription("");
      loadPlaces(); loadOverview();
      toast.success("تم إضافة المكان ✓");
    }).catch(() => toast.error("تعذّرت إضافة المكان — حاول مجدداً"));
  };

  const openEditPlace = (place: Place) => {
    setEditingPlace(place);
    setEditName(place.name);
    setEditDistrict(place.district);
    setEditAddress(place.address);
    setEditCategory(place.category);
  };

  const submitEditPlace = () => {
    if (!editingPlace) return;
    updatePlace(editingPlace.id, { name: editName, district: editDistrict, address: editAddress, category: editCategory.trim() }).then(async () => {
      await logAdminAction(userId, "place_update", "places", editingPlace.id, editName);
      setEditingPlace(null);
      loadPlaces(); loadOverview();
      toast.success("تم حفظ التعديل ✓");
    }).catch(() => toast.error("تعذّر حفظ التعديل — حاول مجدداً"));
  };

  const handleDeletePlace = (place: Place) => {
    if (!window.confirm(`حذف "${place.name}" نهائياً؟`)) return;
    deletePlace(place.id).then(async () => {
      await logAdminAction(userId, "place_delete", "places", place.id, place.name);
      loadPlaces(); loadOverview();
      toast.success("تم حذف المكان ✓");
    }).catch(() => toast.error("تعذّر حذف المكان — حاول مجدداً"));
  };

  const handleVerify = (req: VerificationRequest, status: "approved" | "rejected") => {
    reviewVerificationRequest(req.id, req.placeId, status, userId).then(() => { loadVerify(); loadOverview(); loadPlaces(); toast.success(status === "approved" ? "تم قبول التوثيق ✓" : "تم رفض التوثيق ✓"); }).catch(() => toast.error("تعذّرت مراجعة الطلب — حاول مجدداً"));
  };

  const handleReportAction = (report: Report, status: "resolved" | "dismissed") => {
    const action = status === "resolved" && report.reviewId
      ? deleteReportedReview(report.reviewId).then(() => resolveReport(report.id, status, userId))
      : resolveReport(report.id, status, userId);
    action.then(() => { loadReports(); loadOverview(); toast.success(status === "resolved" ? "تم حل البلاغ ✓" : "تم تجاهل البلاغ ✓"); }).catch(() => toast.error("تعذّرت معالجة البلاغ — حاول مجدداً"));
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24" dir="rtl">
      <div className="sticky top-0 z-20 bg-primary/95 backdrop-blur-sm px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowRight size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">لوحة الإدارة</h1>
            <p className="text-xs text-white/60">مشرف النظام</p>
          </div>
        </div>

        <div className="flex gap-1 bg-white/10 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
          {((FEATURES.paidLists
            ? ["overview", "analytics", "promotions", "places", "users", "verify", "reports", "payouts", "broadcast"]
            : ["overview", "analytics", "promotions", "places", "users", "verify", "reports", "broadcast"]) as ("overview" | "analytics" | "promotions" | "places" | "users" | "verify" | "reports" | "payouts" | "broadcast")[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === t ? "bg-white text-primary" : "text-white/70"
              }`}
            >
              {t === "overview" ? "نظرة عامة" : t === "places" ? "الأماكن" : t === "users" ? "المستخدمون" : t === "verify" ? "التوثيق" : t === "reports" ? "البلاغات" : t === "payouts" ? "المدفوعات" : t === "analytics" ? "التحليلات" : t === "promotions" ? "الترويج" : "الإشعارات"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5">
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {statCards.map(stat => (
                <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {stat.icon}
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Monetization */}
            {FEATURES.paidLists && monetization && (
              <>
                <h3 className="text-sm font-bold text-muted-foreground mb-3">الاقتصاد 💰</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "إيرادات المنصة (٢٠٪)", value: `${monetization.platformRevenue.toLocaleString("en-US")} ر.س`, icon: <Coins size={16} className="text-accent" /> },
                    { label: "إجمالي المبيعات", value: monetization.totalSales.toLocaleString("en-US"), icon: <Tag size={16} className="text-accent" /> },
                    { label: "سحوبات معلقة", value: `${monetization.pendingPayouts.toLocaleString("en-US")} ر.س`, icon: <Shield size={16} className="text-warning" /> },
                    { label: "المتميزون", value: monetization.creatorsCount.toLocaleString("en-US"), icon: <Crown size={16} className="text-accent" /> },
                  ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs text-muted-foreground">{s.label}</span></div>
                      <p className="text-xl font-bold text-foreground">{s.value}</p>
                    </div>
                  ))}
                </div>
                {monetization.topLists.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-4 mb-4">
                    <h3 className="text-sm font-bold mb-3">الأكثر مبيعاً</h3>
                    <div className="flex flex-col gap-2">
                      {monetization.topLists.map((l, i) => (
                        <div key={l.title} className="flex items-center justify-between">
                          <p className="text-xs text-foreground">{i + 1}. {l.title} <span className="text-muted-foreground">({l.sales.toLocaleString("en-US")} بيع)</span></p>
                          <span className="text-xs font-bold text-accent">{l.revenue.toLocaleString("en-US")} ر.س</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">آخر الأنشطة</h3>
                <button
                  onClick={() => { const next = !auditExpanded; setAuditExpanded(next); loadOverview(next); }}
                  className="text-xs text-accent font-semibold"
                >
                  {auditExpanded ? "إخفاء السجل الكامل" : "عرض السجل الكامل"}
                </button>
              </div>
              {auditExpanded && (
                <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
                  {AUDIT_FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setAuditFilter(f.key)}
                      className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        auditFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد أنشطة بعد</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {auditLog.filter(e => auditFilter === "all" || e.action.startsWith(auditFilter)).map(entry => (
                    <div key={entry.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        entry.action.startsWith("verify") ? "bg-warning-soft" : entry.action.startsWith("report") ? "bg-danger-soft" : "bg-success-soft"
                      }`}>
                        {entry.action.startsWith("verify") ? <Shield size={14} className="text-warning" /> :
                         entry.action.startsWith("report") ? <Flag size={14} className="text-danger" /> :
                         <Plus size={14} className="text-success" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug">
                          {ACTION_LABELS[entry.action] ?? entry.action} {entry.detail ? `· ${entry.detail}` : ""} — {entry.actorName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "places" && (() => {
          const q = placeQuery.trim();
          let filteredPlaces = q
            ? places.filter(p => p.name.includes(q) || p.nameEn.toLowerCase().includes(q.toLowerCase()) || p.district.includes(q))
            : places;
          if (curationQueue !== "all") {
            filteredPlaces = filteredPlaces
              .filter(p => inQueue(p, curationQueue))
              .sort((a, b) => (b.googleReviewCount ?? 0) - (a.googleReviewCount ?? 0));
          }
          return (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-muted-foreground">{filteredPlaces.length.toLocaleString("en-US")} مكان</h2>
              <button
                onClick={() => setShowAddPlaceModal(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-full text-xs font-semibold"
              >
                <Plus size={13} /> إضافة مكان
              </button>
            </div>
            <div className="relative mb-4">
              <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={placeQuery}
                onChange={e => setPlaceQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الحي..."
                className="w-full bg-card border border-border rounded-2xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            {/* Curation work-queues */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
              {CURATION_QUEUES.map(queue => {
                const count = queue.key === "all" ? places.length : places.filter(p => inQueue(p, queue.key)).length;
                return (
                  <button
                    key={queue.key}
                    onClick={() => setCurationQueue(queue.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      curationQueue === queue.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {queue.label} ({count.toLocaleString("en-US")})
                  </button>
                );
              })}
            </div>
            {filteredPlaces.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا نتائج</p>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredPlaces.slice(0, placeListLimit).map(place => (
                  <div key={place.id} className="p-3 bg-card border border-border rounded-2xl">
                    <div className="flex gap-3">
                      <img src={place.image} alt={place.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-foreground truncate">{place.name}</h3>
                          {place.isVerified && <span className="text-xs bg-success-soft text-success px-1.5 py-0.5 rounded-full flex-shrink-0">موثق</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {place.district} · {place.type}{place.category ? ` · ${place.category}` : ""}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={11} className="fill-rating text-rating" />
                          <span className="text-xs">{place.rating}</span>
                          <span className="text-xs text-muted-foreground">({place.reviewCount})</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => openEditPlace(place)} className="px-2 py-1 bg-muted text-foreground text-xs rounded-lg">تعديل</button>
                        <button onClick={() => handleDeletePlace(place)} className="px-2 py-1 bg-danger-soft text-danger text-xs rounded-lg">حذف</button>
                      </div>
                    </div>
                    {/* Curation quick-toggles */}
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {CURATION_FLAGS.map(f => (
                        <button
                          key={f.key}
                          onClick={() => toggleCuration(place, f.key, f.db)}
                          className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                            place[f.key]
                              ? "bg-accent/15 text-accent font-semibold"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredPlaces.length > placeListLimit && (
                  <button
                    onClick={() => setPlaceListLimit(l => l + ADMIN_LIST_PAGE)}
                    className="w-full py-3 rounded-2xl bg-muted text-foreground text-xs font-semibold"
                  >
                    عرض المزيد ({(filteredPlaces.length - placeListLimit).toLocaleString("en-US")} متبقي)
                  </button>
                )}
              </div>
            )}
          </>
          );
        })()}

        {activeTab === "users" && (
          <div className="mb-4">
            <div className="relative mb-4">
              <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                placeholder="ابحث عن مستخدم بالاسم..."
                className="w-full bg-card border border-border rounded-2xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا نتائج</p>
            ) : (
              <div className="flex flex-col gap-3">
                {users.map(u => (
                  <div key={u.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-foreground">{u.name}</h3>
                          {u.role === "admin" && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">مشرف 🛡️</span>}
                          {FEATURES.paidLists && u.isCreator && <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">متميز 💰</span>}
                          {u.ownedPlaceName && <span className="text-xs bg-success-soft text-success px-1.5 py-0.5 rounded-full">🏪 {u.ownedPlaceName}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{u.username ? `${u.username} · ` : ""}انضم {u.date}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {FEATURES.paidLists && (
                      <button
                        onClick={() => handleToggleCreator(u)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${u.isCreator ? "bg-danger-soft text-danger" : "bg-accent/10 text-accent"}`}
                      >
                        {u.isCreator ? "سحب صلاحية المتميز" : "منح صلاحية متميز"}
                      </button>
                      )}
                      <button
                        onClick={() => { setAssignTarget(u); setAssignQuery(""); }}
                        className="px-3 py-1.5 rounded-xl bg-muted text-foreground text-xs font-semibold"
                      >
                        <Store size={11} className="inline ml-1" />{u.ownedPlaceId ? "تغيير المكان" : "تعيين مكان"}
                      </button>
                      {u.ownedPlaceId && (
                        <button
                          onClick={() => handleRemoveOwnership(u)}
                          className="px-3 py-1.5 rounded-xl bg-danger-soft text-danger text-xs font-semibold"
                        >
                          إزالة الملكية
                        </button>
                      )}
                      {u.id !== userId && (
                        <button
                          onClick={() => handleToggleAdmin(u)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${u.role === "admin" ? "bg-danger-soft text-danger" : "bg-primary/10 text-primary"}`}
                        >
                          {u.role === "admin" ? "إزالة صلاحية المشرف" : "ترقية لمشرف"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "verify" && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-muted-foreground mb-3">طلبات التوثيق ({verifyRequests.length})</h2>
            {verifyRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد طلبات معلقة</p>
            ) : (
              <div className="flex flex-col gap-3">
                {verifyRequests.map(req => (
                  <div key={req.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{req.placeName}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">المالك: {req.ownerName}</p>
                        <p className="text-xs text-muted-foreground">{req.date}</p>
                      </div>
                      <span className="bg-warning-soft text-warning text-xs px-2 py-1 rounded-full">معلق</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleVerify(req, "approved")} className="flex-1 py-2 rounded-xl bg-success-soft text-success text-xs font-semibold flex items-center justify-center gap-1">
                        <Check size={13} /> قبول
                      </button>
                      <button onClick={() => handleVerify(req, "rejected")} className="flex-1 py-2 rounded-xl bg-danger-soft text-danger text-xs font-semibold flex items-center justify-center gap-1">
                        <X size={13} /> رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-muted-foreground mb-3">البلاغات ({reports.length})</h2>
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بلاغات مفتوحة</p>
            ) : (
              <div className="flex flex-col gap-3">
                {reports.map(report => (
                  <div key={report.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Flag size={13} className="text-red-500" />
                          <h3 className="text-sm font-semibold text-foreground">{report.reason}</h3>
                        </div>
                        {report.placeName && <p className="text-xs text-muted-foreground">المكان: {report.placeName}</p>}
                        <p className="text-xs text-muted-foreground">بلّغ به: {report.reporterName} · {report.date}</p>
                      </div>
                      <span className="bg-danger-soft text-danger text-xs px-2 py-1 rounded-full flex-shrink-0">جديد</span>
                    </div>
                    <div className="flex gap-2">
                      {report.reviewId && (
                        <button onClick={() => handleReportAction(report, "resolved")} className="flex-1 py-2 rounded-xl bg-danger-soft text-danger text-xs font-semibold">
                          حذف المحتوى
                        </button>
                      )}
                      <button onClick={() => handleReportAction(report, "dismissed")} className="flex-1 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold">
                        تجاهل
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-muted-foreground mb-3">
              طلبات السحب ({payoutRequests.filter(p => p.status === "pending").length} معلق)
            </h2>
            {payoutRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد طلبات سحب</p>
            ) : (
              <div className="flex flex-col gap-3">
                {payoutRequests.map(p => (
                  <div key={p.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{p.creatorName}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.date}</p>
                      </div>
                      <span className="text-base font-bold text-accent">{p.amount.toLocaleString("en-US")} ر.س</span>
                    </div>
                    {p.status === "pending" ? (
                      <button
                        onClick={() => handleMarkPayoutPaid(p.id)}
                        className="w-full mt-2 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                      >
                        تم التحويل ✓
                      </button>
                    ) : (
                      <span className={`inline-block mt-1 text-xs px-2.5 py-1 rounded-full ${
                        p.status === "paid" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                      }`}>
                        {p.status === "paid" ? "تم التحويل ✓" : "مرفوض"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && <AdminAnalytics />}

        {activeTab === "promotions" && <AdminPromotions userId={userId} onReload={loadOverview} />}

        {activeTab === "broadcast" && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-muted-foreground mb-3">إشعار جماعي 📢</h2>
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">العنوان</label>
                <input
                  type="text"
                  value={bcTitle}
                  onChange={e => setBcTitle(e.target.value)}
                  placeholder="مثل: أماكن جديدة أُضيفت هذا الأسبوع ✨"
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">النص</label>
                <textarea
                  value={bcBody}
                  onChange={e => setBcBody(e.target.value)}
                  rows={3}
                  placeholder="محتوى الإشعار..."
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">الفئة المستهدفة</label>
                <div className="flex gap-2">
                  {([
                    { key: "all" as const, label: "الجميع" },
                    { key: "owners" as const, label: "أصحاب الأماكن" },
                    ...(FEATURES.paidLists ? [{ key: "creators" as const, label: "المتميزون" }] : []),
                  ]).map(seg => (
                    <button
                      key={seg.key}
                      onClick={() => setBcSegment(seg.key)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        bcSegment === seg.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {seg.label}
                    </button>
                  ))}
                </div>
              </div>
              {bcResult && (
                <p className={`text-xs text-center ${bcResult.ok ? "text-success" : "text-destructive"}`}>{bcResult.text}</p>
              )}
              <Button
                fullWidth
                onClick={handleSendBroadcast}
                disabled={!bcTitle.trim() || !bcBody.trim() || bcSending}
                loading={bcSending}
              >
                إرسال الإشعار 📢
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              يصل الإشعار لجرس التنبيهات داخل التطبيق فوراً
            </p>
          </div>
        )}
      </div>

      {/* Assign Place Ownership Modal */}
      {assignTarget && (
        <div className="absolute inset-0 z-50 flex items-end" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignTarget(null)} />
          <div className="relative w-full bg-card rounded-t-3xl p-6 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">تعيين مكان لـ {assignTarget.name}</h3>
              <button onClick={() => setAssignTarget(null)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="relative mb-4">
              <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={assignQuery}
                onChange={e => setAssignQuery(e.target.value)}
                placeholder="ابحث عن المكان..."
                autoFocus
                className="w-full bg-input-background border border-border rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex flex-col gap-2">
              {places
                .filter(p => assignQuery.trim() && (p.name.includes(assignQuery.trim()) || p.nameEn.toLowerCase().includes(assignQuery.trim().toLowerCase())))
                .slice(0, 8)
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAssignPlace(p)}
                    className="flex items-center gap-3 p-3 bg-background border border-border rounded-2xl text-right hover:border-accent/50 transition-colors"
                  >
                    <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.district} · {p.type}</p>
                    </div>
                  </button>
                ))}
              {!assignQuery.trim() && (
                <p className="text-xs text-muted-foreground text-center py-4">اكتب اسم المكان للبحث</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Place Modal */}
      {showAddPlaceModal && (
        <div className="absolute inset-0 z-50 flex items-end" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddPlaceModal(false)} />
          <div className="relative w-full bg-card rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">إضافة مكان</h3>
              <button onClick={() => setShowAddPlaceModal(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الاسم</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">النوع</label>
                <div className="flex gap-3">
                  {(["كافيه", "مطعم"] as const).map(t => (
                    <button key={t} onClick={() => setNewType(t)} className={`flex-1 p-3 rounded-2xl border text-sm font-semibold transition-all ${newType === t ? "border-accent bg-accent/5 text-accent" : "border-border text-foreground"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الحي</label>
                <input type="text" value={newDistrict} onChange={e => setNewDistrict(e.target.value)} className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">العنوان</label>
                <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)} className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الوصف</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={3} className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">خط العرض</label>
                  <input type="text" value={newLat} onChange={e => setNewLat(e.target.value)} className="w-full bg-input-background border border-border rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">خط الطول</label>
                  <input type="text" value={newLng} onChange={e => setNewLng(e.target.value)} className="w-full bg-input-background border border-border rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <Button onClick={submitNewPlace} disabled={!newName.trim() || !newDistrict.trim()} fullWidth>
                <Check size={16} /> إضافة المكان
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Place Modal */}
      {editingPlace && (
        <div className="absolute inset-0 z-50 flex items-end" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingPlace(null)} />
          <div className="relative w-full bg-card rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">تعديل المكان</h3>
              <button onClick={() => setEditingPlace(null)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الاسم</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الحي</label>
                <input type="text" value={editDistrict} onChange={e => setEditDistrict(e.target.value)} className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">العنوان</label>
                <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">التصنيف (مثل: قهوة مختصة، فطور، حلويات)</label>
                <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="اتركه فارغاً بلا تصنيف" className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <Button onClick={submitEditPlace} disabled={!editName.trim()} fullWidth>
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
