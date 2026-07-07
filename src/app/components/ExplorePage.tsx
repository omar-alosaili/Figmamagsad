import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X, Wifi, Users, Baby, Trees, Map, List } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { displayRating, type Place } from "./data";
import { getPlaces } from "../lib/places";
import { PlaceCard } from "./PlaceCard";

type Props = {
  onPlaceClick: (id: string) => void;
  savedPlaces: Set<string>;
  onSave: (id: string) => void;
  initialQuery?: string;
};

type Filters = {
  district: string;
  type: string;
  isWorkFriendly: boolean;
  isFamilyFriendly: boolean;
  isKidsFriendly: boolean;
  hasOutdoorSeating: boolean;
  isOpen: boolean;
  isNew: boolean;
  priceLevel: number | null;
};

const defaultFilters: Filters = {
  district: "الجميع",
  type: "الكل",
  isWorkFriendly: false,
  isFamilyFriendly: false,
  isKidsFriendly: false,
  hasOutdoorSeating: false,
  isOpen: false,
  isNew: false,
  priceLevel: null,
};

// Projects a place's real lat/lng onto the mock map's 0-100% container space.
const LAT_RANGE: [number, number] = [24.55, 24.95];
const LNG_RANGE: [number, number] = [46.55, 46.85];
function projectToMap(lat: number, lng: number) {
  const top = 85 - ((lat - LAT_RANGE[0]) / (LAT_RANGE[1] - LAT_RANGE[0])) * 70;
  const left = 15 + ((lng - LNG_RANGE[0]) / (LNG_RANGE[1] - LNG_RANGE[0])) * 70;
  return { top: Math.min(85, Math.max(15, top)), left: Math.min(85, Math.max(15, left)) };
}

export function ExplorePage({ onPlaceClick, savedPlaces, onSave, initialQuery }: Props) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapSelected, setMapSelected] = useState<string | null>(null);

  useEffect(() => {
    getPlaces().then(setPlaces).catch(console.error);
  }, []);

  // Offer only districts that actually have places, so the filter always matches data.
  const districts = ["الجميع", ...[...new Set(places.map(p => p.district).filter(Boolean))].sort()];

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "district") return v !== "الجميع";
    if (k === "type") return v !== "الكل";
    if (k === "priceLevel") return v !== null;
    return v === true;
  }).length;

  const filtered = places.filter(p => {
    if (query && !p.name.includes(query) && !p.district.includes(query) && !p.category.includes(query)) return false;
    if (filters.district !== "الجميع" && p.district !== filters.district) return false;
    if (filters.type !== "الكل" && p.type !== filters.type) return false;
    if (filters.isWorkFriendly && !p.isWorkFriendly) return false;
    if (filters.isFamilyFriendly && !p.isFamilyFriendly) return false;
    if (filters.isKidsFriendly && !p.isKidsFriendly) return false;
    if (filters.hasOutdoorSeating && !p.hasOutdoorSeating) return false;
    if (filters.isOpen && !p.isOpen) return false;
    if (filters.isNew && !p.isNew) return false;
    if (filters.priceLevel && p.priceLevel !== filters.priceLevel) return false;
    return true;
  });

  const toggle = (key: keyof Filters) => {
    setFilters(f => ({ ...f, [key]: !f[key as keyof typeof f] }));
  };

  const selectedPlace = places.find(p => p.id === mapSelected);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" dir="rtl">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-5 pt-14 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-foreground">اكتشف</h1>
          {/* View Toggle */}
          <div className="flex gap-1 bg-muted p-1 rounded-2xl">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <List size={13} /> قائمة
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "map" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Map size={13} /> خريطة
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="مكان، حي، تصنيف..."
              className="w-full bg-card border border-border rounded-2xl pr-11 pl-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex-shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${
              showFilters || activeFilterCount > 0
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-foreground"
            }`}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mx-5 mb-3 bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">الفلاتر</h3>
                <button onClick={() => setFilters(defaultFilters)} className="text-xs text-accent font-medium">
                  مسح الكل
                </button>
              </div>

              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">النوع</p>
                <div className="flex gap-2">
                  {["الكل", "كافيه", "مطعم"].map(t => (
                    <button
                      key={t}
                      onClick={() => setFilters(f => ({ ...f, type: t }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        filters.type === t ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">السعر</p>
                <div className="flex gap-2">
                  {[null, 1, 2, 3].map(level => (
                    <button
                      key={level ?? "all"}
                      onClick={() => setFilters(f => ({ ...f, priceLevel: level }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        filters.priceLevel === level ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      {level === null ? "الكل" : level === 1 ? "＄" : level === 2 ? "＄＄" : "＄＄＄"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">الحي</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {districts.map(d => (
                    <button
                      key={d}
                      onClick={() => setFilters(f => ({ ...f, district: d }))}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        filters.district === d ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">المميزات</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "isWorkFriendly" as const, label: "للعمل", icon: <Wifi size={13} /> },
                    { key: "isFamilyFriendly" as const, label: "للعائلة", icon: <Users size={13} /> },
                    { key: "isKidsFriendly" as const, label: "للأطفال", icon: <Baby size={13} /> },
                    { key: "hasOutdoorSeating" as const, label: "جلسات خارجية", icon: <Trees size={13} /> },
                    { key: "isOpen" as const, label: "مفتوح الآن", icon: null },
                    { key: "isNew" as const, label: "جديد", icon: null },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => toggle(key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        filters[key] ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {viewMode === "list" ? (
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <p className="text-sm text-muted-foreground mb-4 pt-1">
            {filtered.length} مكان{query ? ` لـ "${query}"` : ""}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-foreground font-medium">ما لقينا نتائج</p>
              <p className="text-muted-foreground text-sm mt-1">جرب كلمة أخرى أو عدّل الفلاتر</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((place, i) => (
                <motion.div
                  key={place.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
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
          )}
        </div>
      ) : (
        /* Map View */
        <div className="flex-1 relative overflow-hidden">
          {/* Map Background */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(135deg, #e8f4e8 0%, #d4e8d4 30%, #c8dfc8 60%, #e0e8d0 100%)",
          }}>
            {/* Grid lines */}
            {[...Array(12)].map((_, i) => (
              <div key={`h${i}`} className="absolute w-full border-t border-white/40" style={{ top: `${(i + 1) * 8}%` }} />
            ))}
            {[...Array(8)].map((_, i) => (
              <div key={`v${i}`} className="absolute h-full border-r border-white/40" style={{ left: `${(i + 1) * 12.5}%` }} />
            ))}

            {/* Mock Roads */}
            <div className="absolute inset-0 opacity-60">
              <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="none">
                <path d="M200 0 L200 700" stroke="#d4c5a9" strokeWidth="8" fill="none" />
                <path d="M0 350 L400 350" stroke="#d4c5a9" strokeWidth="8" fill="none" />
                <path d="M0 200 L400 300" stroke="#e0d0b0" strokeWidth="5" fill="none" />
                <path d="M100 0 L300 700" stroke="#e0d0b0" strokeWidth="4" fill="none" />
                <path d="M0 150 L200 400 L400 500" stroke="#e0d0b0" strokeWidth="3" fill="none" />
                <path d="M0 500 L150 350 L400 200" stroke="#e0d0b0" strokeWidth="3" fill="none" />
              </svg>
            </div>

            {/* District labels */}
            {[
              { label: "العليا", top: "40%", left: "52%" },
              { label: "الملقا", top: "18%", left: "42%" },
              { label: "النخيل", top: "32%", left: "30%" },
              { label: "الغدير", top: "14%", left: "60%" },
            ].map(d => (
              <div
                key={d.label}
                className="absolute text-xs text-gray-500 font-medium opacity-60 pointer-events-none"
                style={{ top: d.top, left: d.left, transform: "translate(-50%,-50%)" }}
              >
                {d.label}
              </div>
            ))}

            {/* Place Pins — with many results, draw small dots instead of
                labeled pins so the map stays readable; the selected place
                still gets a full labeled pin. */}
            {filtered.map(place => {
              const pos = projectToMap(place.latitude, place.longitude);
              const isSelected = mapSelected === place.id;
              const dotMode = filtered.length > 40 && !isSelected;
              return (
                <motion.button
                  key={place.id}
                  style={{
                    position: "absolute",
                    top: `${pos.top}%`,
                    left: `${pos.left}%`,
                    transform: dotMode ? "translate(-50%, -50%)" : "translate(-50%, -100%)",
                  }}
                  onClick={() => setMapSelected(isSelected ? null : place.id)}
                  whileHover={{ scale: dotMode ? 1.6 : 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isSelected ? { scale: 1.15 } : { scale: 1 }}
                >
                  {dotMode ? (
                    <div
                      className={`w-3 h-3 rounded-full border-2 border-white shadow-md ${
                        place.isOpen ? "bg-accent" : "bg-gray-400"
                      }`}
                    />
                  ) : (
                    <div className={`relative flex flex-col items-center ${isSelected ? "z-10" : ""}`}>
                      <div className={`px-2.5 py-1.5 rounded-2xl shadow-lg border-2 flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-primary text-white border-primary"
                          : place.isOpen
                          ? "bg-white text-foreground border-white"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}>
                        <img src={place.image} alt="" className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-xs font-bold whitespace-nowrap">{place.name}</span>
                      </div>
                      <div className={`w-2 h-2 rotate-45 mt-[-4px] ${isSelected ? "bg-primary" : "bg-white"}`} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Selected Place Card */}
          <AnimatePresence>
            {selectedPlace && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute bottom-4 left-4 right-4 bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
                dir="rtl"
              >
                <div
                  className="flex gap-3 p-4 cursor-pointer"
                  onClick={() => onPlaceClick(selectedPlace.id)}
                >
                  <img src={selectedPlace.image} alt={selectedPlace.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{selectedPlace.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedPlace.type} · {selectedPlace.district}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${selectedPlace.isOpen ? "bg-green-100 text-green-700" : "bg-red-50 text-red-500"}`}>
                        {selectedPlace.isOpen ? "مفتوح" : "مغلق"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center gap-1 text-xs">
                        <span className="text-amber-400">★</span>
                        <span className="font-semibold">{displayRating(selectedPlace).rating}</span>
                        <span className="text-muted-foreground">({displayRating(selectedPlace).count})</span>
                      </span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-muted-foreground text-xs">{selectedPlace.openingHours}</span>
                    </div>
                    <button
                      className="mt-2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-xl"
                      onClick={e => { e.stopPropagation(); onPlaceClick(selectedPlace.id); }}
                    >
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result count badge */}
          <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 shadow-sm">
            <span className="text-xs font-semibold text-foreground">{filtered.length} مكان</span>
          </div>
        </div>
      )}
    </div>
  );
}
