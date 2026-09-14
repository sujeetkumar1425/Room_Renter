import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ACTIVE_CITY, isCityAvailable } from "./data";

type LocationStatus = "unknown" | "granted" | "denied" | "manual";

type AppState = {
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
  const [city, setCityState] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationStatus>("unknown");
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
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
    [city, status, saved, ready, showLocationModal],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export { ACTIVE_CITY };
