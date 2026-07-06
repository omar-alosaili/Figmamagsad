import { lazy, Suspense, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "motion/react";
import { Home, Search, List, User, Tag } from "lucide-react";
import { supabase } from "./lib/supabase";
import type { Profile } from "./lib/types";
import { getSavedPlaceIds, toggleSavedPlace } from "./lib/savedPlaces";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { HomePage } from "./components/HomePage";
import { ExplorePage } from "./components/ExplorePage";
import { ListsPage } from "./components/ListsPage";
import { ProfilePage } from "./components/ProfilePage";
import { OffersPage } from "./components/OffersPage";
import { PlacePage } from "./components/PlacePage";

// Owner/admin screens are rarely reached — split them out of the main bundle
const BusinessDashboard = lazy(() =>
  import("./components/BusinessDashboard").then(m => ({ default: m.BusinessDashboard }))
);
const AdminPanel = lazy(() =>
  import("./components/AdminPanel").then(m => ({ default: m.AdminPanel }))
);

const GUEST_MODE_KEY = "magsad_guest_mode";

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

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still loading
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guestMode, setGuestMode] = useState(() => localStorage.getItem(GUEST_MODE_KEY) === "1");
  const [screen, setScreen] = useState<Screen>({ type: "home" });
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [exploreQuery, setExploreQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // A real session supersedes guest mode
  useEffect(() => {
    if (session?.user) {
      localStorage.removeItem(GUEST_MODE_KEY);
      setGuestMode(false);
    }
  }, [session?.user?.id]);

  const enterGuestMode = () => {
    localStorage.setItem(GUEST_MODE_KEY, "1");
    setGuestMode(true);
  };

  // Leaving guest mode returns the user to the onboarding/auth screens
  const exitGuestMode = () => {
    localStorage.removeItem(GUEST_MODE_KEY);
    setGuestMode(false);
    setActiveTab("home");
    setScreen({ type: "home" });
  };

  const handleLogout = () => {
    supabase.auth.signOut().catch(console.error);
    setActiveTab("home");
    setScreen({ type: "home" });
  };

  const refreshProfile = () => {
    if (!session?.user) { setProfile(null); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data }) => setProfile(data as Profile | null));
  };

  useEffect(refreshProfile, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) return;
    getSavedPlaceIds(session.user.id).then(setSavedPlaces).catch(console.error);
  }, [session?.user?.id]);

  const onboarded = guestMode || (session !== undefined && session !== null);

  useEffect(() => {
    if (screen.type === "business" && !profile?.owned_place_id) setScreen({ type: activeTab });
    if (screen.type === "admin" && profile?.role !== "admin") setScreen({ type: activeTab });
  }, [screen.type, profile]);

  const handleSave = (id: string) => {
    const wasSaved = savedPlaces.has(id);
    setSavedPlaces(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(id); else next.add(id);
      return next;
    });
    if (session?.user) {
      toggleSavedPlace(session.user.id, id, wasSaved).catch(console.error);
    }
  };

  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    setScreen({ type: tab });
  };

  const goToPlace = (id: string) => setScreen({ type: "place", id });
  const goToList = () => { setActiveTab("lists"); setScreen({ type: "lists" }); };
  const goBack = () => setScreen({ type: activeTab });
  const onSearch = (q: string) => { setExploreQuery(q); navigate("explore"); };

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
        return (
          <HomePage
            onPlaceClick={goToPlace}
            onListClick={goToList}
            onSearch={onSearch}
            onSeeAllOffers={() => navigate("offers")}
            onSeeAllLists={() => navigate("lists")}
            savedPlaces={savedPlaces}
            onSave={handleSave}
            currentUser={profile}
          />
        );
      case "explore":
        return <ExplorePage onPlaceClick={goToPlace} savedPlaces={savedPlaces} onSave={handleSave} initialQuery={exploreQuery} />;
      case "lists":
        return <ListsPage userId={session?.user?.id ?? null} onPlaceClick={goToPlace} savedPlaces={savedPlaces} onSave={handleSave} />;
      case "profile":
        return (
          <ProfilePage
            userId={session?.user?.id ?? null}
            currentUser={profile}
            onPlaceClick={goToPlace}
            onListClick={goToList}
            savedPlaces={savedPlaces}
            onLoginClick={exitGuestMode}
            onProfileUpdated={refreshProfile}
            onLogout={handleLogout}
          />
        );
      case "offers":
        return <OffersPage userId={session?.user?.id ?? null} onPlaceClick={goToPlace} />;
      case "place":
        return <PlacePage placeId={screen.id} userId={session?.user?.id ?? null} onBack={goBack} savedPlaces={savedPlaces} onSave={handleSave} onListClick={goToList} />;
      case "business":
        return profile?.owned_place_id && session?.user ? (
          <BusinessDashboard userId={session.user.id} placeId={profile.owned_place_id} onBack={goBack} />
        ) : null;
      case "admin":
        return profile?.role === "admin" && session?.user ? (
          <AdminPanel userId={session.user.id} onBack={goBack} />
        ) : null;
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
                <OnboardingScreen onComplete={enterGuestMode} />
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
                <Suspense fallback={null}>{renderScreen()}</Suspense>
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
            {(profile?.owned_place_id || profile?.role === "admin") && (
              <div className="flex gap-2 px-4 pb-4 pt-1" dir="rtl">
                {profile?.owned_place_id && (
                  <button
                    onClick={() => setScreen({ type: "business" })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    🏪 لوحة المكان
                  </button>
                )}
                {profile?.role === "admin" && (
                  <button
                    onClick={() => setScreen({ type: "admin" })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/8 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
                    style={{ backgroundColor: "rgba(44,24,16,0.06)" }}
                  >
                    🛡️ لوحة الإدارة
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
