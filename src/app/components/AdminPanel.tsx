import { useEffect, useState } from "react";
import { ArrowRight, Plus, Check, X, Shield, Flag, Tag, Users, Star } from "lucide-react";
import type { Place } from "./data";
import { getPlaces, createPlace, updatePlace, deletePlace } from "../lib/places";
import {
  getOverviewStats, getVerificationRequests, reviewVerificationRequest,
  getReports, resolveReport, deleteReportedReview, getAuditLog, logAdminAction,
  type VerificationRequest, type Report, type AuditLogEntry,
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
};

export function AdminPanel({ userId, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "places" | "verify" | "reports">("overview");
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

  const loadOverview = () => {
    getOverviewStats().then(setStats).catch(console.error);
    getAuditLog(6).then(setAuditLog).catch(console.error);
  };
  const loadPlaces = () => getPlaces().then(setPlaces).catch(console.error);
  const loadVerify = () => getVerificationRequests().then(setVerifyRequests).catch(console.error);
  const loadReports = () => getReports().then(setReports).catch(console.error);

  useEffect(() => {
    loadOverview();
    loadPlaces();
    loadVerify();
    loadReports();
  }, []);

  const statCards = [
    { label: "إجمالي الأماكن", value: stats.places.toLocaleString("ar"), icon: <Tag size={18} className="text-accent" /> },
    { label: "المستخدمون", value: stats.users.toLocaleString("ar"), icon: <Users size={18} className="text-accent" /> },
    { label: "طلبات توثيق", value: stats.pendingVerifications.toLocaleString("ar"), icon: <Shield size={18} className="text-amber-500" /> },
    { label: "بلاغات معلقة", value: stats.openReports.toLocaleString("ar"), icon: <Flag size={18} className="text-red-500" /> },
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
    }).catch(console.error);
  };

  const openEditPlace = (place: Place) => {
    setEditingPlace(place);
    setEditName(place.name);
    setEditDistrict(place.district);
    setEditAddress(place.address);
  };

  const submitEditPlace = () => {
    if (!editingPlace) return;
    updatePlace(editingPlace.id, { name: editName, district: editDistrict, address: editAddress }).then(async () => {
      await logAdminAction(userId, "place_update", "places", editingPlace.id, editName);
      setEditingPlace(null);
      loadPlaces(); loadOverview();
    }).catch(console.error);
  };

  const handleDeletePlace = (place: Place) => {
    if (!window.confirm(`حذف "${place.name}" نهائياً؟`)) return;
    deletePlace(place.id).then(async () => {
      await logAdminAction(userId, "place_delete", "places", place.id, place.name);
      loadPlaces(); loadOverview();
    }).catch(console.error);
  };

  const handleVerify = (req: VerificationRequest, status: "approved" | "rejected") => {
    reviewVerificationRequest(req.id, req.placeId, status, userId).then(() => { loadVerify(); loadOverview(); loadPlaces(); }).catch(console.error);
  };

  const handleReportAction = (report: Report, status: "resolved" | "dismissed") => {
    const action = status === "resolved" && report.reviewId
      ? deleteReportedReview(report.reviewId).then(() => resolveReport(report.id, status, userId))
      : resolveReport(report.id, status, userId);
    action.then(() => { loadReports(); loadOverview(); }).catch(console.error);
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

        <div className="flex gap-1 bg-white/10 p-1 rounded-2xl">
          {(["overview", "places", "verify", "reports"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === t ? "bg-white text-primary" : "text-white/70"
              }`}
            >
              {t === "overview" ? "نظرة عامة" : t === "places" ? "الأماكن" : t === "verify" ? "التوثيق" : "البلاغات"}
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

            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <h3 className="text-sm font-bold mb-3">آخر الأنشطة</h3>
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد أنشطة بعد</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {auditLog.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        entry.action.startsWith("verify") ? "bg-amber-100" : entry.action.startsWith("report") ? "bg-red-100" : "bg-green-100"
                      }`}>
                        {entry.action.startsWith("verify") ? <Shield size={14} className="text-amber-600" /> :
                         entry.action.startsWith("report") ? <Flag size={14} className="text-red-600" /> :
                         <Plus size={14} className="text-green-600" />}
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

        {activeTab === "places" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-muted-foreground">{places.length} مكان</h2>
              <button
                onClick={() => setShowAddPlaceModal(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-full text-xs font-semibold"
              >
                <Plus size={13} /> إضافة مكان
              </button>
            </div>
            {places.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد أماكن بعد</p>
            ) : (
              <div className="flex flex-col gap-3">
                {places.map(place => (
                  <div key={place.id} className="flex gap-3 p-3 bg-card border border-border rounded-2xl">
                    <img src={place.image} alt={place.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-foreground truncate">{place.name}</h3>
                        {place.isVerified && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0">موثق</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{place.district} · {place.type}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs">{place.rating}</span>
                        <span className="text-xs text-muted-foreground">({place.reviewCount})</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => openEditPlace(place)} className="px-2 py-1 bg-muted text-foreground text-xs rounded-lg">تعديل</button>
                      <button onClick={() => handleDeletePlace(place)} className="px-2 py-1 bg-red-50 text-red-500 text-xs rounded-lg">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
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
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">معلق</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleVerify(req, "approved")} className="flex-1 py-2 rounded-xl bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center gap-1">
                        <Check size={13} /> قبول
                      </button>
                      <button onClick={() => handleVerify(req, "rejected")} className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold flex items-center justify-center gap-1">
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
                      <span className="bg-red-50 text-red-500 text-xs px-2 py-1 rounded-full flex-shrink-0">جديد</span>
                    </div>
                    <div className="flex gap-2">
                      {report.reviewId && (
                        <button onClick={() => handleReportAction(report, "resolved")} className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold">
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
      </div>

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
              <button onClick={submitNewPlace} disabled={!newName.trim() || !newDistrict.trim()} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Check size={16} /> إضافة المكان
              </button>
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
              <button onClick={submitEditPlace} disabled={!editName.trim()} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
