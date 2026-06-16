import { useState } from "react";
import { ArrowRight, Plus, Check, X, Shield, FileText, Flag, Tag, Users, Star } from "lucide-react";
import { PLACES } from "./data";

type Props = { onBack: () => void };

export function AdminPanel({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "places" | "verify" | "reports">("overview");

  const verifyRequests = [
    { id: 1, name: "كافيه ليلى", owner: "ليلى الغامدي", date: "منذ ٢ أيام", status: "pending" },
    { id: 2, name: "مطعم الشرق", owner: "أحمد المالكي", date: "منذ ٣ أيام", status: "pending" },
    { id: 3, name: "سبريسو كافيه", owner: "سلمى العنزي", date: "منذ أسبوع", status: "pending" },
  ];

  const reports = [
    { id: 1, type: "تعليق مسيء", place: "ماتشا تايم", reporter: "مستخدم", date: "منذ ساعة" },
    { id: 2, type: "معلومات خاطئة", place: "بلو ووتر", reporter: "صاحب المكان", date: "منذ يومين" },
  ];

  const stats = [
    { label: "إجمالي الأماكن", value: "٢٤٧", icon: <Tag size={18} className="text-accent" /> },
    { label: "المستخدمون", value: "١٢,٣٤٥", icon: <Users size={18} className="text-accent" /> },
    { label: "طلبات توثيق", value: "٨", icon: <Shield size={18} className="text-amber-500" /> },
    { label: "بلاغات معلقة", value: "٣", icon: <Flag size={18} className="text-red-500" /> },
  ];

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
              {stats.map(stat => (
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
              <div className="flex flex-col gap-3">
                {[
                  { text: "طلب توثيق جديد من كافيه ليلى", time: "منذ ٢ ساعات", type: "verify" },
                  { text: "بلاغ على تعليق في ماتشا تايم", time: "منذ ٣ ساعات", type: "report" },
                  { text: "تم إضافة مكان جديد: فيراندا", time: "منذ يوم", type: "place" },
                  { text: "تم قبول توثيق سحاب", time: "منذ يومين", type: "verify" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.type === "verify" ? "bg-amber-100" : activity.type === "report" ? "bg-red-100" : "bg-green-100"
                    }`}>
                      {activity.type === "verify" ? <Shield size={14} className="text-amber-600" /> :
                       activity.type === "report" ? <Flag size={14} className="text-red-600" /> :
                       <Plus size={14} className="text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">{activity.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "places" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-muted-foreground">{PLACES.length} مكان</h2>
              <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-full text-xs font-semibold">
                <Plus size={13} /> إضافة مكان
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {PLACES.map(place => (
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
                    <button className="px-2 py-1 bg-muted text-foreground text-xs rounded-lg">تعديل</button>
                    <button className="px-2 py-1 bg-red-50 text-red-500 text-xs rounded-lg">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "verify" && (
          <>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-muted-foreground mb-3">طلبات التوثيق ({verifyRequests.length})</h2>
              <div className="flex flex-col gap-3">
                {verifyRequests.map(req => (
                  <div key={req.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{req.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">المالك: {req.owner}</p>
                        <p className="text-xs text-muted-foreground">{req.date}</p>
                      </div>
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">معلق</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 rounded-xl bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center gap-1">
                        <Check size={13} /> قبول
                      </button>
                      <button className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold flex items-center justify-center gap-1">
                        <X size={13} /> رفض
                      </button>
                      <button className="flex-1 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold">
                        مراجعة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "reports" && (
          <>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-muted-foreground mb-3">البلاغات ({reports.length})</h2>
              <div className="flex flex-col gap-3">
                {reports.map(report => (
                  <div key={report.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Flag size={13} className="text-red-500" />
                          <h3 className="text-sm font-semibold text-foreground">{report.type}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">المكان: {report.place}</p>
                        <p className="text-xs text-muted-foreground">{report.date}</p>
                      </div>
                      <span className="bg-red-50 text-red-500 text-xs px-2 py-1 rounded-full">جديد</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold">
                        حذف المحتوى
                      </button>
                      <button className="flex-1 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold">
                        تجاهل
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
