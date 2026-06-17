import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Home, Search, List, User, Tag } from "lucide-react";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import { getPlaces, getSavedPlaces, toggleSave } from "../lib/api";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { HomePage } from "./components/HomePage";
import { ExplorePage } from "./components/ExplorePage";
import { ListsPage } from "./components/ListsPage";
import { ProfilePage } from "./components/ProfilePage";
import { OffersPage } from "./components/OffersPage";
import { PlacePage } from "./components/PlacePage";
import { BusinessDashboard } from "./components/BusinessDashboard";
import { AdminPanel } from "./components/AdminPanel";

type Screen =
  | { type: "home" }
  | { type: "explore" }
  | { type: "lists" }
  | { type: "profile" }
  | { type: "offers" }
  | { type: "place"; id: string }
  | { type: "business" }
  | { type: "admin" };

type Tab = "home" | "explore" | "lists" | "offers" | "profile";

const FONT = "'Noto Kufi Arabic', 'Noto Sans Arabic', sans-serif";

function AppInner() {
  const { user, token, loading: authLoading } = useAuth();
  const [onboarded, setOnboarded] = useState(false);
  const [screen, setScreen] = useState<Screen>({ type: "home" });
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [places, setPlaces] = useState<unknown[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);

  // auto-onboard if already logged in
  useEffect(() => {
    if (!authLoading && user) setOnboarded(true);
  }, [authLoading, user]);

  // load places from backend
  useEffect(() => {
    getPlaces()
      .then(data => setPlaces(data))
      .catch(console.error)
      .finally(() => setPlacesLoading(false));
  }, []);

  // load saved places for logged-in user
  useEffect(() => {
    if (user) {
      getSavedPlaces(user.id)
        .then(ids => setSavedPlaces(new Set(ids)))
        .catch(console.error);
    }
  }, [user]);

  const handleSave = async (id: string) => {
    // optimistic update
    setSavedPlaces(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (token) {
      try { await toggleSave(id, token); } catch (e) { console.error("save error:", e); }
    }
  };

  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    setScreen({ type: tab });
  };

  const goToPlace = (id: string) => setScreen({ type: "place", id });
  const goToList = () => { setActiveTab("lists"); setScreen({ type: "lists" }); };
  const goBack = () => setScreen({ type: activeTab });

  const isFullScreen = screen.type === "place" || screen.type === "business" || screen.type === "admin";

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "home",    icon: <Home size={21} />,   label: "الرئيسية" },
    { key: "explore", icon: <Search size={21} />, label: "اكتشف" },
    { key: "offers",  icon: <Tag size={21} />,    label: "العروض" },
    { key: "lists",   icon: <List size={21} />,   label: "القوائم" },
    { key: "profile", icon: <User size={21} />,   label: "حسابي" },
  ];

  const renderScreen = () => {
    switch (screen.type) {
      case "home":
        return <HomePage onPlaceClick={goToPlace} onListClick={goToList} savedPlaces={savedPlaces} onSave={handleSave} />;
      case "explore":
        return <ExplorePage onPlaceClick={goToPlace} savedPlaces={savedPlaces} onSave={handleSave} />;
      case "lists":
        return <ListsPage onPlaceClick={goToPlace} savedPlaces={savedPlaces} onSave={handleSave} />;
      case "profile":
        return <ProfilePage onPlaceClick={goToPlace} onListClick={goToList} savedPlaces={savedPlaces} />;
      case "offers":
        return <OffersPage onPlaceClick={goToPlace} />;
      case "place":
        return <PlacePage placeId={screen.id} onBack={goBack} savedPlaces={savedPlaces} onSave={handleSave} onListClick={goToList} />;
      case "business":
        return <BusinessDashboard onBack={goBack} />;
      case "admin":
        return <AdminPanel onBack={goBack} />;
    }
  };

  return (
    <div className="size-full flex items-center justify-center bg-[#1a1a1a]">
      <div
        className="relative flex flex-col bg-background overflow-hidden shadow-2xl"
        style={{
          fontFamily: FONT,
          width: "100%",
          maxWidth: 430,
          height: "100%",
          maxHeight: 900,
        }}
      >
        {/* Simulated Status Bar */}
        <div
          className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-6"
          style={{ height: 44, pointerEvents: "none" }}
        >
          <span className="text-xs font-semibold" style={{ color: isFullScreen || !onboarded ? "rgba(255,255,255,0.7)" : "rgba(28,15,8,0.5)" }}>
            ٩:٤١
          </span>
          <div className="flex items-center gap-1.5">
            {/* Signal */}
            <div className="flex gap-0.5 items-end">
              {[3, 5, 7, 9].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-sm"
                  style={{
                    height: h,
                    background: isFullScreen || !onboarded ? "rgba(255,255,255,0.6)" : "rgba(28,15,8,0.45)",
                    opacity: i === 3 ? 0.35 : 1,
                  }}
                />
              ))}
            </div>
            {/* Battery */}
            <div
              className="flex items-center relative"
              style={{ width: 22, height: 11, border: "1.5px solid", borderColor: isFullScreen || !onboarded ? "rgba(255,255,255,0.5)" : "rgba(28,15,8,0.4)", borderRadius: 3 }}
            >
              <div
                style={{
                  margin: 1.5,
                  width: "70%",
                  height: "100%",
                  background: isFullScreen || !onboarded ? "rgba(255,255,255,0.6)" : "rgba(28,15,8,0.45)",
                  borderRadius: 1.5,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: -4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 2.5,
                  height: 5,
                  background: isFullScreen || !onboarded ? "rgba(255,255,255,0.4)" : "rgba(28,15,8,0.35)",
                  borderRadius: "0 2px 2px 0",
                }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!onboarded ? (
              <motion.div
                key="onboarding"
                className="flex-1 flex flex-col absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <OnboardingScreen onComplete={() => setOnboarded(true)} />
              </motion.div>
            ) : (
              <motion.div
                key={screen.type}
                className="flex-1 flex flex-col absolute inset-0"
                initial={{ opacity: 0, y: isFullScreen ? 30 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: isFullScreen ? 30 : -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderScreen()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Tab Bar */}
        {onboarded && !isFullScreen && (
          <div className="flex-shrink-0 bg-card/96 backdrop-blur-sm border-t border-border z-20" dir="rtl">
            <div className="flex items-center justify-around px-1 pt-2 pb-1">
              {tabs.map(tab => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => navigate(tab.key)}
                    className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-colors relative"
                    style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}
                  >
                    {tab.key === "offers" && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
                    )}
                    {active && (
                      <motion.div
                        layoutId="tab-bg"
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: "rgba(44,24,16,0.06)" }}
                        transition={{ type: "spring", damping: 28, stiffness: 300 }}
                      />
                    )}
                    <motion.div
                      animate={{ scale: active ? 1.12 : 1 }}
                      transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      className="relative z-10"
                    >
                      {tab.icon}
                    </motion.div>
                    <span className="text-xs font-medium leading-none relative z-10">{tab.label}</span>
                    {active && (
                      <motion.div
                        layoutId="tab-dot"
                        className="w-1 h-1 rounded-full bg-accent mt-0.5 relative z-10"
                        transition={{ type: "spring", damping: 28, stiffness: 300 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Access Row */}
            <div className="flex gap-2 px-4 pb-4 pt-1" dir="rtl">
              <button
                onClick={() => setScreen({ type: "business" })}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-secondary transition-colors"
              >
                🏪 لوحة المكان
              </button>
              <button
                onClick={() => setScreen({ type: "admin" })}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/8 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
                style={{ backgroundColor: "rgba(44,24,16,0.06)" }}
              >
                🛡️ لوحة الإدارة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
