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

/* ==========================================================
   REVERSE GEOCODING
========================================================== */

async function getCityFromCoordinates(latitude: number, longitude: number): Promise<string | null> {
  try {
    /*
     * BigDataCloud provides client-side reverse geocoding
     * without requiring an API key.
     */
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        latitude,
      )}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`,
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    /*
     * Depending on the location, BigDataCloud may provide
     * city in different fields.
     */
    const city = data.city || data.locality || data.principalSubdivision || null;

    if (typeof city !== "string" || !city.trim()) {
      return null;
    }

    return city.trim();
  } catch (error) {
    console.error("❌ Reverse geocoding failed:", error);
    return null;
  }
}

/* ==========================================================
   APP PROVIDER
========================================================== */

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

      /*
       * If there is no previously selected location,
       * open the existing location modal.
       */
      if (!storedCity) {
        setShowLocationModal(true);
      }
    } catch {
      setShowLocationModal(true);
    }

    setReady(true);
  }, []);

  /* ==========================================================
     REAL-TIME DEVICE LOCATION
  ========================================================== */

  useEffect(() => {
    if (!ready) {
      return;
    }

    /*
     * Browser does not support geolocation.
     */
    if (!("geolocation" in navigator)) {
      console.warn("⚠️ Browser does not support geolocation.");

      setStatus((current) => (current === "manual" ? current : "denied"));

      return;
    }

    /*
     * IMPORTANT:
     *
     * If the user manually selected a city,
     * don't immediately replace it with GPS.
     */
    const currentStatus = localStorage.getItem(STATUS_KEY) as LocationStatus | null;

    if (currentStatus === "manual") {
      return;
    }

    let cancelled = false;

    const handlePosition = async (position: GeolocationPosition) => {
      if (cancelled) {
        return;
      }

      const { latitude, longitude } = position.coords;

      console.log("📍 Current location:", latitude, longitude);

      setStatus("granted");

      try {
        localStorage.setItem(STATUS_KEY, "granted");
      } catch {
        /* storage unavailable */
      }

      const detectedCity = await getCityFromCoordinates(latitude, longitude);

      if (cancelled || !detectedCity) {
        return;
      }

      console.log("📍 Detected city:", detectedCity);

      /*
       * Update the existing global city state.
       */
      setCityState(detectedCity);

      try {
        localStorage.setItem(CITY_KEY, detectedCity);

        localStorage.setItem(STATUS_KEY, "granted");
      } catch {
        /* storage unavailable */
      }

      /*
       * Keep location modal closed once
       * we successfully detected the location.
       */
      setShowLocationModal(false);
    };

    const handleError = (error: GeolocationPositionError) => {
      if (cancelled) {
        return;
      }

      console.warn("⚠️ Geolocation error:", error.message);

      /*
       * Don't overwrite an existing manual location.
       */
      const stored = localStorage.getItem(STATUS_KEY) as LocationStatus | null;

      if (stored === "manual") {
        return;
      }

      if (error.code === error.PERMISSION_DENIED) {
        setStatus("denied");

        try {
          localStorage.setItem(STATUS_KEY, "denied");
        } catch {
          /* storage unavailable */
        }
      }
    };

    /*
     * watchPosition keeps the location updated while
     * the user is using the application.
     */
    const watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 15_000,
    });

    return () => {
      cancelled = true;

      navigator.geolocation.clearWatch(watchId);
    };
  }, [ready]);

  /* ==========================================================
     RESTORE AUTH + ROLE
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const restoreAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

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

      if (!mounted) {
        return;
      }

      if (profile?.role === "renter" || profile?.role === "landlord") {
        setRole(profile.role);
      } else {
        setRole(null);
      }
    };

    void restoreAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

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

      if (!user || !mounted) {
        return;
      }

      const { data, error } = await supabase
        .from("saved_properties")
        .select("property_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ Could not load saved rooms:", error);

        return;
      }

      if (!mounted) {
        return;
      }

      const ids = (data ?? []).map((row) => String(row.property_id)).filter(Boolean);

      setSaved(ids);

      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
      } catch {
        /* storage unavailable */
      }
    };

    void syncSavedRooms();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     CITY
  ========================================================== */

  const setCity = (next: string, nextStatus: LocationStatus = "manual") => {
    const normalizedCity = next.trim();

    if (!normalizedCity) {
      return;
    }

    setCityState(normalizedCity);
    setStatus(nextStatus);

    try {
      localStorage.setItem(CITY_KEY, normalizedCity);

      localStorage.setItem(STATUS_KEY, nextStatus);
    } catch {
      /* storage unavailable */
    }

    /*
     * Manual selection should close the modal.
     */
    if (nextStatus === "manual") {
      setShowLocationModal(false);
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
      }
    })();
  };

  /* ==========================================================
     CONTEXT VALUE
  ========================================================== */

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

/* ==========================================================
   HOOK
========================================================== */

export function useApp() {
  const ctx = useContext(Ctx);

  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return ctx;
}

export { ACTIVE_CITY };
