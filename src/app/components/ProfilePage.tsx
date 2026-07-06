import { useEffect, useState } from "react";
import { Settings, List, Bookmark, MapPin, ChevronLeft, User, X } from "lucide-react";
import type { List as ListType, Place } from "./data";
import type { Profile } from "../lib/types";
import { getMyLists } from "../lib/lists";
import { getVisitedPlaces } from "../lib/visitedPlaces";
import { getSuggestedUsers, getFollowingIds, toggleFollowUser, updateProfile, getFollowCounts } from "../lib/profile";
import { getPlaces } from "../lib/places";

type Props = {
  userId: string | null;
  currentUser: Profile | null;
  onPlaceClick: (id: string) => void;
  onListClick: (id: string) => void;
  savedPlaces: Set<string>;
  onLoginClick?: () => void;
};

export function ProfilePage({ userId, currentUser, onPlaceClick, onListClick, savedPlaces, onLoginClick }: Props) {
  const [tab, setTab] = useState<"lists" | "saved" | "visited">("lists");
  const [userLists, setUserLists] = useState<ListType[]>([]);
  const [visitedPlacesList, setVisitedPlacesList] = useState<Place[]>([]);
  const [savedPlacesArray, setSavedPlacesArray] = useState<Place[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");

  useEffect(() => {
    if (!userId) return;
    getMyLists(userId).then(setUserLists).catch(console.error);
    getVisitedPlaces(userId, "visited").then(setVisitedPlacesList).catch(console.error);
    getSuggestedUsers(userId).then(setSuggestedUsers).catch(console.error);
    getFollowingIds(userId).then(setFollowingIds).catch(console.error);
    getFollowCounts(userId).then(setFollowCounts).catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (currentUser) { setEditName(currentUser.name); setEditBio(currentUser.bio); }
  }, [currentUser]);

  useEffect(() => {
    if (savedPlaces.size === 0) { setSavedPlacesArray([]); return; }
    getPlaces().then(all => setSavedPlacesArray(all.filter(p => savedPlaces.has(p.id)))).catch(console.error);
  }, [savedPlaces]);

  const toggleFollow = (targetId: string) => {
    if (!userId) return;
    const currentlyFollowing = followingIds.has(targetId);
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (currentlyFollowing) next.delete(targetId); else next.add(targetId);
      return next;
    });
    toggleFollowUser(userId, targetId, currentlyFollowing).catch(console.error);
  };

  const saveProfileEdit = () => {
    if (!userId) return;
    updateProfile(userId, { name: editName, bio: editBio }).then(() => setShowEditModal(false)).catch(console.error);
  };

  const shareProfile = () => {
    const url = `${window.location.origin}/?u=${userId ?? ""}`;
    if (navigator.share) navigator.share({ title: currentUser?.name ?? "مقصد", url }).catch(() => {});
    else navigator.clipboard.writeText(url).catch(() => {});
  };

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <User size={28} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-base font-bold text-foreground mb-1">أنت تتصفح كزائر</p>
          <p className="text-sm text-muted-foreground">سجل الدخول لحفظ أماكنك وإنشاء قوائمك الخاصة</p>
        </div>
        {onLoginClick && (
          <button
            onClick={onLoginClick}
            className="px-8 py-3 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            تسجيل الدخول
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 pt-14 pb-0">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="w-20 h-20 rounded-full object-cover border-3 border-accent"
                  style={{ borderWidth: 3 }}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-3 border-accent text-2xl font-bold text-muted-foreground" style={{ borderWidth: 3 }}>
                  {currentUser.name?.[0] ?? "؟"}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{currentUser.name || "بلا اسم"}</h1>
              {currentUser.username && <p className="text-sm text-muted-foreground">{currentUser.username}</p>}
              {currentUser.bio && <p className="text-xs text-muted-foreground mt-1">{currentUser.bio}</p>}
            </div>
          </div>
          <button onClick={() => setShowEditModal(true)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Settings size={16} className="text-foreground" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex divide-x divide-border rtl:divide-x-reverse mb-5">
          {[
            { label: "متابع", value: followCounts.followers.toLocaleString("ar") },
            { label: "متابَع", value: followCounts.following.toLocaleString("ar") },
            { label: "قوائم", value: userLists.length },
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
          <button
            onClick={() => setShowEditModal(true)}
            className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            تعديل الملف
          </button>
          <button
            onClick={shareProfile}
            className="flex-1 py-2.5 rounded-2xl bg-muted text-foreground text-sm font-semibold hover:bg-secondary transition-colors"
          >
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
          <div>
            {visitedPlacesList.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">📍</p>
                <p className="text-sm text-muted-foreground">لم تسجل زيارات بعد</p>
                <p className="text-xs text-muted-foreground mt-1">افتح صفحة مكان وسجل زيارتك</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visitedPlacesList.map(place => (
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
      </div>

      {/* Suggested Users to Follow */}
      {suggestedUsers.length > 0 && (
        <div className="px-5 mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3">اكتشف أشخاصاً تتابعهم</h2>
          <div className="flex flex-col gap-3">
            {suggestedUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-bold text-muted-foreground">
                    {u.name?.[0] ?? "؟"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{u.name || "بلا اسم"}</h3>
                  {u.username && <p className="text-xs text-muted-foreground">{u.username}</p>}
                  {u.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{u.bio}</p>}
                </div>
                <button
                  onClick={() => toggleFollow(u.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  {followingIds.has(u.id) ? "متابَع ✓" : "تابع"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full bg-card rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">تعديل الملف</h3>
              <button onClick={() => setShowEditModal(false)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الاسم</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">نبذة</label>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
              <button
                onClick={saveProfileEdit}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
