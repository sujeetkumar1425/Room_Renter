import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "./supabase";
import { ACTIVE_CITY, isCityAvailable } from "./data";

type LocationStatus = "unknown" | "granted" | "denied" | "manual";

export type UserRole = "renter" | "landlord" | null;

type AppState = {
  role: UserRole;
  setRole: (role: UserRole) => void;

  city: string | null;
  status: LocationStatus;
  cityAvailable: boolean;
  ready: boolean;
  showLocationModal: boolean;

  openLocationModal: () => void;
  closeLocationModal: () => void;
  setCity: (city: string, status?: LocationStatus) => void;
  setStatus: (status: LocationStatus) => void;

  saved: string[];
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
};

const Ctx = createContext<AppState | null>(null);

const CITY_KEY = "rr.city";
const STATUS_KEY = "rr.status";
const SAVED_KEY = "rr.saved";

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [city, setCityState] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationStatus>("unknown");
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  //const [role, setRole] = useState<UserRole>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem(CITY_KEY);
      const s = localStorage.getItem(STATUS_KEY) as LocationStatus | null;
      const sv = localStorage.getItem(SAVED_KEY);
      if (c) setCityState(c);
      if (s) setStatus(s);
      if (sv) setSaved(JSON.parse(sv));
      if (!c) setShowLocationModal(true);
    } catch {
      setShowLocationModal(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
  let mounted = true;

  const restoreAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!mounted) return;

    if (!session?.user) {
      setRole(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!mounted) return;

    if (
      profile?.role === "renter" ||
      profile?.role === "landlord"
    ) {
      setRole(profile.role);
    } else {
      setRole(null);
    }
  };

  restoreAuth();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setRole(null);
      }
    },
  );

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

  const setCity = (next: string, nextStatus: LocationStatus = "manual") => {
    setCityState(next);
    setStatus(nextStatus);
    try {
      localStorage.setItem(CITY_KEY, next);
      localStorage.setItem(STATUS_KEY, nextStatus);
    } catch {
      /* storage unavailable */
    }
  };

  const toggleSaved = (id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

 const value = useMemo<AppState>(
  () => ({
    role,
    setRole,

    city,
    status,
    cityAvailable: isCityAvailable(city),
    ready,
    showLocationModal,

    openLocationModal: () => setShowLocationModal(true),
    closeLocationModal: () => setShowLocationModal(false),

    setCity,
    setStatus,

    saved,
    toggleSaved,
    isSaved: (id: string) => saved.includes(id),
  }),
  [
  role,
  city,
  status,
  saved,
  ready,
  showLocationModal,
],
);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export { ACTIVE_CITY };
