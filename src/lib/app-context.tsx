import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "./supabase";
import { ACTIVE_CITY, isCityAvailable } from "./data";

type LocationStatus = "unknown" | "granted" | "denied" | "manual";

export type UserRole = "renter" | "landlord" | null;

type AppState = {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [city, setCityState] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationStatus>("unknown");
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  /* ==========================================================
     RESTORE LOCAL SETTINGS
  ========================================================== */
  useEffect(() => {
    try {
      const storedCity = localStorage.getItem(CITY_KEY);
      const storedStatus = localStorage.getItem(STATUS_KEY) as LocationStatus | null;

      const storedSaved = localStorage.getItem(SAVED_KEY);

      if (storedCity) {
        setCityState(storedCity);
      }

      if (storedStatus) {
        setStatus(storedStatus);
      }

      if (storedSaved) {
        try {
          const parsed = JSON.parse(storedSaved);

          if (Array.isArray(parsed)) {
            setSaved(parsed.map((id) => String(id)).filter(Boolean));
          }
        } catch {
          localStorage.removeItem(SAVED_KEY);
        }
      }

      if (!storedCity) {
        setShowLocationModal(true);
      }
    } catch {
      setShowLocationModal(true);
    }

    setReady(true);
  }, []);

  /* ==========================================================
     RESTORE AUTH + ROLE
  ========================================================== */
  useEffect(() => {
    let mounted = true;

    const restoreAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session?.user) {
        setUser(null);
        setRole(null);
        return;
      }

      setUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profile?.role === "renter" || profile?.role === "landlord") {
        setRole(profile.role);
      } else {
        setRole(null);
      }
    };

    restoreAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);

      if (!session?.user) {
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ==========================================================
     LOAD SAVED ROOMS FROM SUPABASE
  ========================================================== */
  useEffect(() => {
    let mounted = true;

    const syncSavedRooms = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      const { data, error } = await supabase
        .from("saved_properties")
        .select("property_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ Could not load saved rooms:", error);
        return;
      }

      if (!mounted) return;

      const ids = (data ?? []).map((row) => String(row.property_id)).filter(Boolean);

      setSaved(ids);

      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
      } catch {
        /* storage unavailable */
      }
    };

    syncSavedRooms();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     CITY
  ========================================================== */
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

  /* ==========================================================
     SAVE / UNSAVE ROOM
  ========================================================== */
  const toggleSaved = (id: string) => {
    const propertyId = String(id);

    const wasSaved = saved.includes(propertyId);

    const next = wasSaved
      ? saved.filter((savedId) => savedId !== propertyId)
      : [...saved, propertyId];

    /* Update UI immediately */
    setSaved(next);

    /* Persist local backup */
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }

    /* Persist in Supabase */
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const numericPropertyId = Number(propertyId);

      if (!Number.isFinite(numericPropertyId)) {
        console.error("❌ Invalid property ID:", propertyId);
        return;
      }

      if (wasSaved) {
        const { error } = await supabase
          .from("saved_properties")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", numericPropertyId);

        if (error) {
          console.error("❌ Remove saved room:", error);

          /* Restore UI if database operation failed */
          setSaved(saved);
          return;
        }

        return;
      }

      const { error } = await supabase.from("saved_properties").upsert(
        {
          user_id: user.id,
          property_id: numericPropertyId,
        },
        {
          onConflict: "user_id,property_id",
        },
      );

      if (error) {
        console.error("❌ Save room:", error);

        /* Restore UI if database operation failed */
        setSaved(saved);
        return;
      }
    })();
  };

  const value = useMemo<AppState>(
    () => ({
      user,
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

      isSaved: (id: string) => saved.includes(String(id)),
    }),
    [user, role, city, status, saved, ready, showLocationModal],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);

  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return ctx;
}

export { ACTIVE_CITY };
