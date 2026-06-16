import { useState } from "react";
import { Settings, Grid, List, Bookmark, MapPin, ChevronLeft } from "lucide-react";
import { USERS, LISTS, PLACES } from "./data";

type Props = {
  onPlaceClick: (id: string) => void;
  onListClick: (id: string) => void;
  savedPlaces: Set<string>;
};

export function ProfilePage({ onPlaceClick, onListClick, savedPlaces }: Props) {
  const [tab, setTab] = useState<"lists" | "saved" | "visited">("lists");
  const user = USERS[0];

  const savedPlacesArray = PLACES.filter(p => savedPlaces.has(p.id));
  const userLists = LISTS.slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 pt-14 pb-0">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-3 border-accent"
                style={{ borderWidth: 3 }}
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.username}</p>
              <p className="text-xs text-muted-foreground mt-1">{user.bio}</p>
            </div>
          </div>
          <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Settings size={16} className="text-foreground" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex divide-x divide-border rtl:divide-x-reverse mb-5">
          {[
            { label: "متابع", value: user.followers.toLocaleString("ar") },
            { label: "متابَع", value: user.following },
            { label: "قوائم", value: user.listsCount },
            { label: "محفوظ", value: savedPlaces.size },
          ].map(stat => (
            <div key={stat.label} className="flex-1 text-center py-2">
              <p className="text-base font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Follow Buttons */}
        <div className="flex gap-3 mb-5">
          <button className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
            تعديل الملف
          </button>
          <button className="flex-1 py-2.5 rounded-2xl bg-muted text-foreground text-sm font-semibold hover:bg-secondary transition-colors">
            مشاركة الملف
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { key: "lists" as const, label: "القوائم", icon: <List size={15} /> },
            { key: "saved" as const, label: "المحفوظة", icon: <Bookmark size={15} /> },
            { key: "visited" as const, label: "الزيارات", icon: <MapPin size={15} /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        {tab === "lists" && (
          <div className="flex flex-col gap-3">
            {userLists.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">📋</p>
                <p className="text-sm text-muted-foreground">لا توجد قوائم بعد</p>
              </div>
            ) : (
              userLists.map(list => (
                <div
                  key={list.id}
                  className="flex gap-3 p-3 bg-card border border-border rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onListClick(list.id)}
                >
                  <img src={list.coverImage} alt={list.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{list.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{list.placeIds.length} أماكن · {list.followers} متابع</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{list.description}</p>
                  </div>
                  <ChevronLeft size={16} className="text-muted-foreground rotate-180 flex-shrink-0 self-center" />
                </div>
              ))
            )}
          </div>
        )}

        {tab === "saved" && (
          <div>
            {savedPlacesArray.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">🔖</p>
                <p className="text-sm text-muted-foreground">لم تحفظ أي مكان بعد</p>
                <p className="text-xs text-muted-foreground mt-1">ابحث عن أماكن واحفظها</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {savedPlacesArray.map(place => (
                  <div
                    key={place.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onPlaceClick(place.id)}
                  >
                    <img src={place.image} alt={place.name} className="w-full h-28 object-cover" />
                    <div className="p-2.5">
                      <h3 className="text-xs font-semibold text-foreground truncate">{place.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{place.district}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "visited" && (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">📍</p>
            <p className="text-sm text-muted-foreground">لم تسجل زيارات بعد</p>
            <p className="text-xs text-muted-foreground mt-1">افتح صفحة مكان وسجل زيارتك</p>
          </div>
        )}
      </div>

      {/* Suggested Users to Follow */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-bold text-foreground mb-3">اكتشف أشخاصاً تتابعهم</h2>
        <div className="flex flex-col gap-3">
          {USERS.slice(1).map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
              <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{u.name}</h3>
                <p className="text-xs text-muted-foreground">{u.username} · {u.followers.toLocaleString("ar")} متابع</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{u.bio}</p>
              </div>
              <button className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                تابع
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
