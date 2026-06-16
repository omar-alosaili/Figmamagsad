import { useState } from "react";
import { Plus, Heart, Bookmark, Lock, Globe, Share2, ArrowRight, X, Check } from "lucide-react";
import { LISTS, PLACES, List } from "./data";

type Props = {
  onPlaceClick: (id: string) => void;
  savedPlaces: Set<string>;
  onSave: (id: string) => void;
};

export function ListsPage({ onPlaceClick, savedPlaces, onSave }: Props) {
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [likedLists, setLikedLists] = useState<Set<string>>(new Set());
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newListPublic, setNewListPublic] = useState(true);
  const [myLists, setMyLists] = useState<List[]>([
    {
      id: "my1",
      userId: "u0",
      title: "المفضلة ❤️",
      description: "أماكن أحبها",
      isPublic: false,
      coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop&auto=format",
      placeIds: ["1", "2"],
      likes: 0,
      followers: 0,
    },
  ]);

  const toggleLike = (id: string) => {
    setLikedLists(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const createList = () => {
    if (!newListName.trim()) return;
    const newList: List = {
      id: `my${Date.now()}`,
      userId: "u0",
      title: newListName,
      description: newListDesc,
      isPublic: newListPublic,
      coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop&auto=format",
      placeIds: [],
      likes: 0,
      followers: 0,
    };
    setMyLists(prev => [...prev, newList]);
    setNewListName("");
    setNewListDesc("");
    setShowCreateModal(false);
  };

  if (selectedList) {
    const places = PLACES.filter(p => selectedList.placeIds.includes(p.id));
    return (
      <div className="flex-1 overflow-y-auto pb-24" dir="rtl">
        {/* Header */}
        <div className="relative h-56">
          <img src={selectedList.coverImage} alt={selectedList.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button
            onClick={() => setSelectedList(null)}
            className="absolute top-14 right-5 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowRight size={20} className="text-foreground" />
          </button>
          <div className="absolute bottom-5 right-5 left-5">
            <div className="flex items-center gap-2 mb-1">
              {selectedList.isPublic ? (
                <Globe size={12} className="text-white/70" />
              ) : (
                <Lock size={12} className="text-white/70" />
              )}
              <span className="text-white/70 text-xs">{selectedList.isPublic ? "عامة" : "خاصة"}</span>
            </div>
            <h1 className="text-white text-xl font-bold">{selectedList.title}</h1>
            {selectedList.description && (
              <p className="text-white/70 text-sm mt-1">{selectedList.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-white/80 text-xs">{selectedList.placeIds.length} أماكن</span>
              <span className="text-white/80 text-xs">{selectedList.followers} متابع</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex gap-3 mb-5">
            <button className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
              <Bookmark size={14} /> متابعة القائمة
            </button>
            <button className="w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center">
              <Share2 size={16} className="text-foreground" />
            </button>
          </div>

          {places.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">القائمة فارغة</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {places.map(place => (
                <div
                  key={place.id}
                  className="flex gap-3 p-3 bg-card rounded-2xl border border-border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onPlaceClick(place.id)}
                >
                  <img src={place.image} alt={place.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{place.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{place.type} · {place.district}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-amber-500">★ {place.rating}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${place.isOpen ? "bg-green-100 text-green-700" : "bg-red-50 text-red-500"}`}>
                        {place.isOpen ? "مفتوح" : "مغلق"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" dir="rtl">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">القوائم</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> قائمة جديدة
          </button>
        </div>
      </div>

      {/* My Lists */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-bold text-muted-foreground mb-3">قوائمي</h2>
        <div className="flex flex-col gap-3">
          {myLists.map(list => (
            <div
              key={list.id}
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedList(list)}
            >
              <img src={list.coverImage} alt={list.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {list.isPublic ? <Globe size={11} className="text-muted-foreground" /> : <Lock size={11} className="text-muted-foreground" />}
                  <h3 className="text-sm font-semibold text-foreground">{list.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{list.placeIds.length} أماكن</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); toggleLike(list.id); }}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <Heart size={15} className={likedLists.has(list.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Lists */}
      <div className="px-5">
        <h2 className="text-sm font-bold text-muted-foreground mb-3">قوائم شائعة</h2>
        <div className="flex flex-col gap-4">
          {LISTS.map(list => (
            <div
              key={list.id}
              className="bg-card border border-border rounded-3xl overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
              onClick={() => setSelectedList(list)}
            >
              <div className="relative h-36">
                <img
                  src={list.coverImage}
                  alt={list.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 right-3 left-3">
                  <h3 className="text-white font-semibold">{list.title}</h3>
                  <p className="text-white/70 text-xs mt-0.5">{list.placeIds.length} أماكن</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-3">{list.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <button
                      onClick={e => { e.stopPropagation(); toggleLike(list.id); }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Heart size={13} className={likedLists.has(list.id) ? "fill-red-500 text-red-500" : ""} />
                      {list.likes + (likedLists.has(list.id) ? 1 : 0)}
                    </button>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Bookmark size={13} />
                      {list.followers}
                    </span>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-accent font-semibold">
                    <Bookmark size={12} /> متابعة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full bg-card rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">قائمة جديدة</h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">اسم القائمة</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="مثل: كافيهات للعمل ☕"
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">وصف (اختياري)</label>
                <textarea
                  value={newListDesc}
                  onChange={e => setNewListDesc(e.target.value)}
                  placeholder="أضف وصفاً للقائمة..."
                  rows={3}
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">الخصوصية</label>
                <div className="flex gap-3">
                  {[
                    { value: true, label: "عامة", icon: <Globe size={14} />, desc: "يراها الجميع" },
                    { value: false, label: "خاصة", icon: <Lock size={14} />, desc: "أنت فقط" },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setNewListPublic(opt.value)}
                      className={`flex-1 p-3 rounded-2xl border text-right transition-all ${
                        newListPublic === opt.value
                          ? "border-accent bg-accent/5 text-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={newListPublic === opt.value ? "text-accent" : "text-muted-foreground"}>
                          {opt.icon}
                        </span>
                        <span className="text-sm font-semibold">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={createList}
                disabled={!newListName.trim()}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Check size={16} /> إنشاء القائمة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
