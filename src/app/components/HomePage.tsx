import { useEffect, useState } from "react";
import { Search, Bell, ChevronLeft, Heart, Bookmark, Star } from "lucide-react";
import { motion } from "motion/react";
import type { Place, List, Offer } from "./data";
import { getPlaces } from "../lib/places";
import { getPublicLists } from "../lib/lists";
import { getActiveOffers } from "../lib/offers";
import { getFollowFeed, type FeedItem } from "../lib/social";
import { getUnreadCount } from "../lib/notifications";
import { tappable } from "../lib/a11y";
import { getActivePromotions } from "../lib/promotions";
import {
  getViewerInterests, getViewerSavedDistricts, rankSuggested, rankByDistance,
  requestUserLocation, type PromotedPlace,
} from "../lib/recommendations";
import type { Profile } from "../lib/types";
import { PlaceCard } from "./PlaceCard";
import { NotificationsPanel } from "./NotificationsPanel";

type Props = {
  onPlaceClick: (id: string) => void;
  onListClick: (id: string) => void;
  onListSelect: (id: string) => void;
  onUserClick: (p: Profile) => void;
  onSearch: (query: string) => void;
  onSeeAllOffers: () => void;
  onSeeAllLists: () => void;
  savedPlaces: Set<string>;
  onSave: (id: string) => void;
  currentUser: Profile | null;
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] },
});

export function HomePage({ onPlaceClick, onListClick, onListSelect, onUserClick, onSearch, onSeeAllOffers, onSeeAllLists, savedPlaces, onSave, currentUser }: Props) {
  const [activeTag, setActiveTag] = useState("الكل");
  const [showNotifs, setShowNotifs] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [newInRiyadh, setNewInRiyadh] = useState<PromotedPlace[]>([]);
  const [suggested, setSuggested] = useState<PromotedPlace[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const nearMe = userLoc !== null;

  // Distance sort is derived, so switching it off restores the
  // default (admin-priority / personalized) order.
  const displayedNew = nearMe ? rankByDistance(newInRiyadh, userLoc.lat, userLoc.lng) : newInRiyadh;
  const displayedSuggested = nearMe ? rankByDistance(suggested, userLoc.lat, userLoc.lng) : suggested;

  useEffect(() => {
    getPlaces().then(setPlaces).catch(console.error);
    getPublicLists().then(setLists).catch(console.error);
    getActiveOffers().then(setOffers).catch(console.error);
  }, []);

  // Discovery sections: admin-curated promotions joined to the cached
  // catalog, personalized when the viewer allows it.
  useEffect(() => {
    if (places.length === 0) return;
    let cancelled = false;
    const byId = new Map(places.map(p => [p.id, p]));
    const join = (promos: Awaited<ReturnType<typeof getActivePromotions>>) =>
      promos.map(pr => ({ promotion: pr, place: byId.get(pr.placeId) }))
        .filter((e): e is PromotedPlace => !!e.place);

    getActivePromotions("home_new")
      .then(promos => { if (!cancelled) setNewInRiyadh(join(promos)); })
      .catch(console.error);

    getActivePromotions("home_suggested").then(async promos => {
      let entries = join(promos);
      const personalize = currentUser?.id && currentUser.personalization_opt_in !== false;
      if (personalize && entries.length > 1) {
        const [interests, savedDistricts] = await Promise.all([
          getViewerInterests(currentUser.id).catch(() => new Set<string>()),
          getViewerSavedDistricts(currentUser.id, places).catch(() => new Set<string>()),
        ]);
        entries = rankSuggested(entries, interests, savedDistricts);
      }
      if (!cancelled) setSuggested(entries);
    }).catch(console.error);

    return () => { cancelled = true; };
  }, [places, currentUser?.id, currentUser?.personalization_opt_in]);

  // "الأقرب لي": explicit tap → browser permission prompt → local sort.
  const toggleNearMe = () => {
    if (nearMe) { setUserLoc(null); return; }
    setLocating(true);
    requestUserLocation()
      .then(setUserLoc)
      .catch(() => {/* permission denied or unavailable — keep default order */})
      .finally(() => setLocating(false));
  };

  useEffect(() => {
    if (currentUser?.id) getFollowFeed(currentUser.id).then(setFeed).catch(console.error);
    else setFeed([]);
  }, [currentUser?.id]);

  // Real unread badge — no more permanently-lit dot.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (currentUser?.id) getUnreadCount(currentUser.id).then(setUnread).catch(console.error);
    else setUnread(0);
  }, [currentUser?.id]);

  const tags = ["الكل", "كافيهات", "مطاعم", "للعمل", "عائلي", "فطور", "جلسات خارجية", "جديد"];

  const matchesTag = (p: Place): boolean => {
    switch (activeTag) {
      case "كافيهات":       return p.type === "كافيه";
      case "مطاعم":         return p.type === "مطعم";
      case "للعمل":         return p.isWorkFriendly;
      case "عائلي":         return p.isFamilyFriendly;
      case "فطور":          return p.category.includes("فطور") || p.tags.some(t => t.includes("فطور"));
      case "جلسات خارجية":  return p.hasOutdoorSeating;
      case "جديد":          return p.isNew;
      default:              return true; // "الكل"
    }
  };
  const taggedPlaces = places.filter(matchesTag);
  const featuredPlace = [...taggedPlaces].sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0) || b.rating - a.rating)[0];
  const suggestedPlaces = taggedPlaces.slice(0, 4);
  // Cap the section — with hundreds of synced places an unbounded list
  // renders every card (and image) at once and freezes the page.
  const newPlaces = taggedPlaces.filter(p => p.isNew).slice(0, 10);

  const submitSearch = () => { if (query.trim()) onSearch(query.trim()); };

  return (
    <>
      <NotificationsPanel
        open={showNotifs}
        onClose={() => setShowNotifs(false)}
        userId={currentUser?.id ?? null}
        onPlaceClick={onPlaceClick}
      />

      <div className="flex-1 overflow-y-auto pb-24" dir="rtl">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-5 pt-14 pb-4">
          <div className="flex items-center justify-between mb-4">
            <motion.div {...fadeUp(0)}>
              <p className="text-sm text-muted-foreground">وين مقصدك اليوم؟</p>
              <h1 className="text-xl font-bold text-foreground">
                مساء الخير{currentUser?.name ? `، ${currentUser.name}` : ""} 👋
              </h1>
            </motion.div>
            <motion.div {...fadeUp(0.05)} className="flex items-center gap-2">
              <button
                onClick={() => { setShowNotifs(true); setUnread(0); }}
                aria-label={unread > 0 ? `الإشعارات، ${unread} غير مقروء` : "الإشعارات"}
                className="relative w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Bell size={18} className="text-foreground" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-accent rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread.toLocaleString("ar")}
                  </span>
                )}
              </button>
              {currentUser?.avatar_url && (
                <img
                  src={currentUser.avatar_url}
                  alt="profile"
                  className="w-10 h-10 rounded-full object-cover border-2 border-accent"
                />
              )}
            </motion.div>
          </div>

          {/* Search Bar */}
          <motion.div {...fadeUp(0.08)} className="relative">
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitSearch(); }}
              placeholder="ابحث عن مكان أو حي..."
              className="w-full bg-card border border-border rounded-2xl pr-11 pl-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
            />
          </motion.div>
        </div>

        {/* Category Tags */}
        <motion.div {...fadeUp(0.1)} className="px-5 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ direction: "rtl" }}>
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTag === tag
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card border border-border text-foreground hover:border-primary/30"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Follow feed — activity from people you follow */}
        {feed.length > 0 && (
          <motion.div {...fadeUp(0.11)} className="mb-8">
            <div className="flex items-center justify-between px-5 mb-4">
              <h2 className="text-base font-bold text-foreground">ممن تتابع 👀</h2>
            </div>
            <div className="px-5 flex flex-col gap-3">
              {feed.slice(0, 8).map(item => {
                const actor = (
                  <button
                    onClick={() => item.actorUsername && onUserClick({ username: item.actorUsername, name: item.actorName } as Profile)}
                    className="text-xs text-accent font-semibold"
                  >
                    @{item.actorUsername ?? item.actorName}
                  </button>
                );
                if (item.kind === "list") {
                  return (
                    <div
                      key={`l-${item.id}`}
                      {...tappable(() => onListSelect(item.list.id), item.list.title)}
                      className="flex gap-3 p-3 bg-card border border-border rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <img src={item.list.coverImage} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">{actor} أنشأ قائمة</p>
                        <h3 className="text-sm font-semibold text-foreground truncate">{item.list.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.list.placeCount} أماكن</p>
                      </div>
                    </div>
                  );
                }
                const p = item.review.place!;
                return (
                  <div
                    key={`r-${item.id}`}
                    {...tappable(() => onPlaceClick(p.id), p.name)}
                    className="flex gap-3 p-3 bg-card border border-border rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <img src={p.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">{actor} أوصى بـ</p>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
                        <span className="flex items-center gap-0.5 text-xs text-amber-500"><Star size={10} className="fill-amber-400 text-amber-400" />{item.review.rating}</span>
                      </div>
                      {item.review.comment && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.review.comment}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Featured Hero */}
        {featuredPlace && (
          <motion.div {...fadeUp(0.12)} className="px-5 mb-8">
            <motion.div
              className="relative h-56 rounded-3xl overflow-hidden cursor-pointer"
              onClick={() => onPlaceClick(featuredPlace.id)}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <img
                src="https://images.unsplash.com/photo-1722951812233-8fd37330dfb9?w=900&h=600&fit=crop&auto=format"
                alt="الرياض"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              <div className="absolute top-4 right-4">
                <span className="bg-accent text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg">
                  ⭐ مميز هذا الأسبوع
                </span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); onSave(featuredPlace.id); }}
                className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
              >
                <Bookmark
                  size={16}
                  className={savedPlaces.has(featuredPlace.id) ? "fill-accent text-accent" : "text-foreground"}
                />
              </button>

              <div className="absolute bottom-4 right-4 left-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white text-xl font-bold">وين مقصدك اليوم؟</h2>
                    <p className="text-white/65 text-sm mt-1">اكتشف أماكن تستاهل التجربة في الرياض</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onPlaceClick(featuredPlace.id); }}
                    className="flex-shrink-0 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl px-3 py-1.5 hover:bg-white/30 transition-colors"
                  >
                    <span className="text-white text-xs font-semibold">اكتشف ←</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Discovery: admin-curated promoted sections */}
        {(displayedNew.length > 0 || displayedSuggested.length > 0) && (
          <motion.div {...fadeUp(0.14)} className="mb-2">
            <div className="flex items-center justify-between px-5 mb-1">
              <span />
              <button
                onClick={toggleNearMe}
                disabled={locating}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  nearMe ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
                }`}
              >
                📍 {locating ? "جارٍ تحديد موقعك..." : nearMe ? "الأقرب لي ✓" : "الأقرب لي"}
              </button>
            </div>
          </motion.div>
        )}

        {displayedNew.length > 0 && (
          <motion.div {...fadeUp(0.15)} className="mb-8">
            <div className="px-5 mb-4">
              <h2 className="text-base font-bold text-foreground">جديد في الرياض ✨</h2>
            </div>
            <div className="flex gap-3 px-5 overflow-x-auto pb-1 scrollbar-hide" style={{ direction: "rtl" }}>
              {displayedNew.slice(0, 10).map(({ promotion, place }) => (
                <div key={promotion.id} {...tappable(() => onPlaceClick(place.id), place.name)} className="flex-shrink-0 w-40 cursor-pointer">
                  <div className="relative h-28 rounded-2xl overflow-hidden">
                    <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
                    {promotion.requestedBy && (
                      <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-black/45 text-white">مروّج</span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-foreground mt-2 truncate">{place.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{place.district}{place.googleRating ? ` · ★ ${place.googleRating}` : ""}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {displayedSuggested.length > 0 && (
          <motion.div {...fadeUp(0.16)} className="mb-8">
            <div className="px-5 mb-4">
              <h2 className="text-base font-bold text-foreground">مقترح لك 💡</h2>
            </div>
            <div className="flex gap-3 px-5 overflow-x-auto pb-1 scrollbar-hide" style={{ direction: "rtl" }}>
              {displayedSuggested.slice(0, 10).map(({ promotion, place }) => (
                <div key={promotion.id} {...tappable(() => onPlaceClick(place.id), place.name)} className="flex-shrink-0 w-40 cursor-pointer">
                  <div className="relative h-28 rounded-2xl overflow-hidden">
                    <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
                    {promotion.requestedBy && (
                      <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-black/45 text-white">مروّج</span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-foreground mt-2 truncate">{place.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{place.district}{place.googleRating ? ` · ★ ${place.googleRating}` : ""}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Offers */}
        {offers.length > 0 && (
          <motion.div {...fadeUp(0.16)} className="mb-8">
            <div className="flex items-center justify-between px-5 mb-4">
              <h2 className="text-base font-bold text-foreground">عروض قريبة منك 🎁</h2>
              <button onClick={onSeeAllOffers} className="text-accent text-sm font-medium flex items-center gap-1">
                الكل <ChevronLeft size={14} className="rotate-180" />
              </button>
            </div>
            <div className="flex gap-3 px-5 overflow-x-auto pb-1 scrollbar-hide" style={{ direction: "rtl" }}>
              {offers.map((offer, i) => {
                const place = places.find(p => p.id === offer.placeId);
                if (!place) return null;
                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.06 }}
                    className="flex-shrink-0 w-64 bg-card rounded-2xl overflow-hidden border border-border cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onPlaceClick(place.id)}
                  >
                    <div className="relative h-32">
                      <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
                      {offer.discount && (
                        <div className="absolute top-2 right-2 bg-accent text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                          {offer.discount} خصم
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">{place.name}</p>
                      <h3 className="text-sm font-semibold text-foreground leading-snug">{offer.title}</h3>
                      <p className="text-xs text-accent mt-1.5 font-medium">ينتهي {offer.endDate}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Popular Lists */}
        {lists.length > 0 && (
          <motion.div {...fadeUp(0.2)} className="mb-8">
            <div className="flex items-center justify-between px-5 mb-4">
              <h2 className="text-base font-bold text-foreground">قوائم رائجة 🔥</h2>
              <button onClick={onSeeAllLists} className="text-accent text-sm font-medium flex items-center gap-1">
                الكل <ChevronLeft size={14} className="rotate-180" />
              </button>
            </div>
            <div className="flex gap-3 px-5 overflow-x-auto pb-1 scrollbar-hide" style={{ direction: "rtl" }}>
              {lists.slice(0, 4).map((list, i) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22 + i * 0.06 }}
                  className="flex-shrink-0 w-48 cursor-pointer group"
                  onClick={() => onListClick(list.id)}
                >
                  <div className="relative h-52 rounded-2xl overflow-hidden">
                    <img
                      src={list.coverImage}
                      alt={list.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                    <div className="absolute bottom-3 right-3 left-3">
                      <h3 className="text-white text-sm font-semibold leading-tight">{list.title}</h3>
                      <p className="text-white/70 text-xs mt-0.5">{list.placeCount} أماكن</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 px-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart size={11} /> {list.likes}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Bookmark size={11} /> {list.followers}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* New Places — catalog fallback, hidden when admins have curated
            the "جديد في الرياض" section (avoids a duplicate header) */}
        {displayedNew.length === 0 && newPlaces.length > 0 && (
          <motion.div {...fadeUp(0.24)} className="mb-8">
            <div className="flex items-center justify-between px-5 mb-4">
              <h2 className="text-base font-bold text-foreground">جديد في الرياض ✨</h2>
            </div>
            <div className="px-5 flex flex-col gap-3">
              {newPlaces.map(place => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  compact
                  onClick={() => onPlaceClick(place.id)}
                  onSave={onSave}
                  saved={savedPlaces.has(place.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Suggested — catalog fallback, hidden when admins have curated
            the "مقترح لك" section */}
        {displayedSuggested.length === 0 && suggestedPlaces.length > 0 && (
          <motion.div {...fadeUp(0.3)} className="mb-4">
            <div className="flex items-center justify-between px-5 mb-4">
              <h2 className="text-base font-bold text-foreground">مقترحة لك 💡</h2>
            </div>
            <div className="px-5 grid grid-cols-1 gap-4">
              {suggestedPlaces.map((place, i) => (
                <motion.div
                  key={place.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 + i * 0.07 }}
                >
                  <PlaceCard
                    place={place}
                    onClick={() => onPlaceClick(place.id)}
                    onSave={onSave}
                    saved={savedPlaces.has(place.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {places.length === 0 && (
          <div className="px-5 py-16 text-center text-muted-foreground text-sm">
            لا توجد أماكن مضافة بعد
          </div>
        )}
        {places.length > 0 && taggedPlaces.length === 0 && (
          <div className="px-5 py-16 text-center text-muted-foreground text-sm">
            لا توجد أماكن تطابق "{activeTag}" حالياً
          </div>
        )}
      </div>
    </>
  );
}
