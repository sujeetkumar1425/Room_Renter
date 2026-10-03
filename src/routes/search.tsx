import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

import "leaflet/dist/leaflet.css";

import {
  MapPin,
  SlidersHorizontal,
  Search as SearchIcon,
  Star,
  Map as MapIcon,
  List,
  X,
} from "lucide-react";

import { Page } from "@/components/Layout";
import { PropertyCard } from "@/components/PropertyCard";
import { ComingSoon } from "@/components/ComingSoon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { ROOM_TYPES, formatINR, shortINR, isCityAvailable } from "@/lib/data";

import { fetchListedProperties, type Property } from "@/lib/properties";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

// ============================================================
// ROUTE
// ============================================================

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    city: typeof s.city === "string" ? s.city : undefined,

    type: typeof s.type === "string" ? s.type : undefined,

    budget: typeof s.budget === "string" ? s.budget : undefined,
  }),

  head: () => ({
    meta: [
      {
        title: "Find a Room — Room Renter",
      },
      {
        name: "description",
        content:
          "Browse verified rooms, PGs, studios and flats near you with live map, price filters and instant owner chat.",
      },
      {
        property: "og:title",
        content: "Find a Room — Room Renter",
      },
      {
        property: "og:description",
        content: "Find verified rooms, PGs, studios and flats near your current location.",
      },
    ],
  }),

  component: SearchPage,
});

// ============================================================
// CONSTANTS
// ============================================================

const amenityFilters = ["Wi-Fi", "AC", "Parking", "Food", "Washing Machine", "Power Backup"];

// ============================================================
// SEARCH PAGE
// ============================================================

function SearchPage() {
  const search = Route.useSearch();

  const { city, setCity, openLocationModal } = useApp();

  const activeCity = search.city ?? city;

  const available = isCityAvailable(activeCity);

  // ==========================================================
  // FILTER STATE
  // ==========================================================

  const [maxRent, setMaxRent] = useState(20000);

  const [type, setType] = useState(
    search.type && search.type !== "Any budget" ? search.type : "Any type",
  );

  const [furnished, setFurnished] = useState(false);

  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [attached, setAttached] = useState(false);

  const [food, setFood] = useState(false);

  const [parking, setParking] = useState(false);

  const [gender, setGender] = useState("Any");

  const [amenities, setAmenities] = useState<string[]>([]);

  const [query, setQuery] = useState("");

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const [selected, setSelected] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  // ==========================================================
  // PROPERTY STATE
  // ==========================================================

  const [properties, setProperties] = useState<Property[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  // ==========================================================
  // LEAFLET REFS
  // ==========================================================

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const leafletMapRef = useRef<LeafletMap | null>(null);

  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const markersRef = useRef<Marker[]>([]);

  // ==========================================================
  // SYNC CITY
  // ==========================================================

  useEffect(() => {
    if (search.city && search.city !== city) {
      setCity(search.city);
    }
  }, [search.city, city, setCity]);

  // ==========================================================
  // LOAD PROPERTIES
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const listed = await fetchListedProperties(activeCity ?? undefined);

        console.log("📍 Properties loaded:", listed);

        if (!cancelled) {
          /*
           * IMPORTANT:
           *
           * We no longer create fake map coordinates.
           *
           * latitude and longitude come directly
           * from Supabase.
           */
          setProperties(listed);
        }
      } catch (error) {
        console.error("Failed to load listed properties:", error);

        if (!cancelled) {
          setProperties([]);

          setLoadError("We couldn't load the listed rooms right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProperties();

    return () => {
      cancelled = true;
    };
  }, [activeCity]);

  // ==========================================================
  // FILTER RESULTS
  // ==========================================================

  const results = useMemo(() => {
    return properties.filter((p) => {
      const propertyAmenities = Array.isArray(p.amenities) ? p.amenities : [];

      const furnishedValue = String(p.furnished ?? "").toLowerCase();

      const genderValue = String(p.gender ?? "Any").toLowerCase();

      const searchableText = [p.title, p.area, p.locality, p.address, p.city, p.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // Available only
      if (!p.available) {
        return false;
      }

      // Rent filter
      if (Number(p.rent) > maxRent) {
        return false;
      }

      // Room type
      if (type !== "Any type" && p.roomType !== type) {
        return false;
      }

      // Furnished
      if (furnished && !["fully furnished", "semi furnished", "true"].includes(furnishedValue)) {
        return false;
      }

      // Verified
      if (verifiedOnly && !p.verified) {
        return false;
      }

      // Attached bathroom
      if (
        attached &&
        !propertyAmenities.some((a: string) => a.toLowerCase().includes("attached bathroom"))
      ) {
        return false;
      }

      // Food
      if (food && !propertyAmenities.some((a: string) => a.toLowerCase() === "food")) {
        return false;
      }

      // Parking
      if (parking && !propertyAmenities.some((a: string) => a.toLowerCase() === "parking")) {
        return false;
      }

      // Gender
      if (gender !== "Any" && genderValue !== "any" && genderValue !== gender.toLowerCase()) {
        return false;
      }

      // Amenities
      if (
        amenities.some(
          (a) => !propertyAmenities.some((pa: string) => pa.toLowerCase() === a.toLowerCase()),
        )
      ) {
        return false;
      }

      // Search
      if (query && !searchableText.includes(query.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [
    properties,
    maxRent,
    type,
    furnished,
    verifiedOnly,
    attached,
    food,
    parking,
    gender,
    amenities,
    query,
  ]);

  // ==========================================================
  // MAP-VALID PROPERTIES
  // ==========================================================

  const mappedProperties = useMemo(() => {
    return results.filter((property) => {
      const latitude = Number(property.latitude);

      const longitude = Number(property.longitude);

      return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      );
    });
  }, [results]);

  // ==========================================================
  // SELECTED PROPERTY
  // ==========================================================

  const selectedProperty = results.find((p) => String(p.id) === selected);

  // ==========================================================
  // TOGGLE AMENITY
  // ==========================================================

  const toggleAmenity = (amenity: string) => {
    setAmenities((previous) =>
      previous.includes(amenity)
        ? previous.filter((item) => item !== amenity)
        : [...previous, amenity],
    );
  };

  // ==========================================================
  // INITIALIZE LEAFLET MAP
  // ==========================================================

  useEffect(() => {
    if (!available) {
      return;
    }

    if (!mapContainerRef.current) {
      return;
    }

    let cancelled = false;

    async function initializeMap() {
      try {
        const leaflet = await import("leaflet");

        if (cancelled) {
          return;
        }

        leafletRef.current = leaflet;

        /*
         * Don't initialize twice.
         */
        if (leafletMapRef.current) {
          return;
        }

        const map = leaflet.map(mapContainerRef.current!, {
          center: [0, 0],
          zoom: 2,
          zoomControl: true,
        });

        leafletMapRef.current = map;

        /*
         * OpenStreetMap tiles
         */
        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          })
          .addTo(map);

        /*
         * Fix map sizing after
         * rendering.
         */
        setTimeout(() => {
          if (leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
          }
        }, 100);

        /*
         * Also invalidate when the
         * browser finishes layout.
         */
        setTimeout(() => {
          if (leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
          }
        }, 500);
      } catch (error) {
        console.error("Leaflet initialization failed:", error);
      }
    }

    initializeMap();

    return () => {
      cancelled = true;
    };
  }, [available]);

  // ==========================================================
  // UPDATE MAP MARKERS
  // ==========================================================

  useEffect(() => {
    const map = leafletMapRef.current;

    const leaflet = leafletRef.current;

    if (!map || !leaflet) {
      return;
    }

    // --------------------------------------------------------
    // Remove old markers
    // --------------------------------------------------------

    markersRef.current.forEach((marker) => {
      try {
        map.removeLayer(marker);
      } catch {
        // Ignore already removed marker
      }
    });

    markersRef.current = [];

    // --------------------------------------------------------
    // No mapped properties
    // --------------------------------------------------------

    if (mappedProperties.length === 0) {
      return;
    }

    // --------------------------------------------------------
    // Create markers
    // --------------------------------------------------------

    const bounds = leaflet.latLngBounds([]);

    mappedProperties.forEach((property) => {
      const latitude = Number(property.latitude);

      const longitude = Number(property.longitude);

      bounds.extend([latitude, longitude]);

      /*
       * Price marker.
       */
      const markerIcon = leaflet.divIcon({
        className: "room-renter-price-marker",

        html: `
              <div
                style="
                  background: ${selected === String(property.id) ? "#111827" : "#ffffff"};
                  color: ${selected === String(property.id) ? "#ffffff" : "#111827"};
                  border: 2px solid #009688;
                  border-radius: 999px;
                  padding: 7px 11px;
                  font-size: 12px;
                  font-weight: 700;
                  white-space: nowrap;
                  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
                  cursor: pointer;
                "
              >
                ${shortINR(property.rent)}
              </div>
            `,

        iconSize: undefined,

        iconAnchor: [0, 0],
      });

      const marker = leaflet
        .marker([latitude, longitude], {
          icon: markerIcon,
        })
        .addTo(map);

      /*
       * Marker click.
       */
      marker.on("click", () => {
        setSelected(String(property.id));

        map.flyTo([latitude, longitude], 15, {
          duration: 0.8,
        });
      });

      /*
       * Tooltip.
       */
      marker.bindTooltip(
        `
            <strong>
              ${property.title}
            </strong>
            <br />
            ${formatINR(property.rent)}/month
          `,
        {
          direction: "top",

          offset: [0, -10],
        },
      );

      markersRef.current.push(marker);
    });

    // --------------------------------------------------------
    // Fit map to markers
    // --------------------------------------------------------

    if (mappedProperties.length === 1) {
      const property = mappedProperties[0];

      map.setView([Number(property.latitude), Number(property.longitude)], 15);
    } else {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 14,
      });
    }
  }, [mappedProperties, selected]);

  // ==========================================================
  // SELECTED PROPERTY → FLY TO
  // ==========================================================

  useEffect(() => {
    const map = leafletMapRef.current;

    if (!map || !selectedProperty) {
      return;
    }

    const latitude = Number(selectedProperty.latitude);

    const longitude = Number(selectedProperty.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    map.flyTo([latitude, longitude], 15, {
      duration: 0.8,
    });
  }, [selectedProperty]);

  // ==========================================================
  // FILTER PANEL
  // ==========================================================

  const Filters = (
    <div className="space-y-6">
      {/* MAX RENT */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Max rent</Label>

          <span className="text-sm font-semibold text-primary">{formatINR(maxRent)}</span>
        </div>

        <Slider
          className="mt-4"
          min={3000}
          max={20000}
          step={500}
          value={[maxRent]}
          onValueChange={(value) => setMaxRent(value[0])}
        />
      </div>

      {/* ROOM TYPE */}
      <div>
        <Label className="text-sm font-semibold">Room type</Label>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            onClick={() => setType("Any type")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              type === "Any type"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            Any type
          </button>

          {ROOM_TYPES.map((roomType) => (
            <button
              key={roomType}
              onClick={() => setType(roomType)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                type === roomType
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {roomType}
            </button>
          ))}
        </div>
      </div>

      {/* AMENITIES */}
      <div>
        <Label className="text-sm font-semibold">Amenities</Label>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {amenityFilters.map((amenity) => (
            <button
              key={amenity}
              onClick={() => toggleAmenity(amenity)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                amenities.includes(amenity)
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {amenity}
            </button>
          ))}
        </div>
      </div>

      {/* GENDER */}
      <div>
        <Label className="text-sm font-semibold">Gender preference</Label>

        <div className="mt-2.5 flex gap-2">
          {["Any", "Male", "Female"].map((value) => (
            <button
              key={value}
              onClick={() => setGender(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                gender === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* SWITCHES */}
      <div className="space-y-3 border-t border-border pt-4">
        {[
          {
            label: "Fully furnished",
            value: furnished,
            set: setFurnished,
          },

          {
            label: "Attached bathroom",
            value: attached,
            set: setAttached,
          },

          {
            label: "Food included",
            value: food,
            set: setFood,
          },

          {
            label: "Parking",
            value: parking,
            set: setParking,
          },

          {
            label: "Verified only",
            value: verifiedOnly,
            set: setVerifiedOnly,
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <Label className="text-sm font-normal">{row.label}</Label>

            <Switch checked={row.value} onCheckedChange={row.set} />
          </div>
        ))}
      </div>
    </div>
  );

  // ==========================================================
  // MAP PANEL
  // ==========================================================

  const MapPanel = (
    <div className="relative h-[calc(100vh-10rem)] min-h-[360px] w-full overflow-hidden rounded-2xl border border-border bg-muted sm:h-[min(68vh,620px)] sm:min-h-[420px] lg:h-[calc(100vh-9rem)] lg:min-h-[520px]">
      {/* REAL LEAFLET MAP */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* MAP HEADER */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-[500] sm:left-4 sm:right-auto sm:top-4">
        <div className="w-fit max-w-full truncate rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur">
          {activeCity ?? "Selected city"} · {results.length} rooms
        </div>
      </div>

      {/* NO COORDINATES MESSAGE */}
      {!isLoading && results.length > 0 && mappedProperties.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[450] flex items-center justify-center">
          <div className="pointer-events-auto mx-4 max-w-sm rounded-2xl bg-background/95 p-6 text-center shadow-xl backdrop-blur">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <MapPin className="h-6 w-6 text-primary" />
            </div>

            <h3 className="mt-3 font-semibold">Property locations are not available yet</h3>

            <p className="mt-1.5 text-sm text-muted-foreground">
              New listings with a selected map location will appear here.
            </p>
          </div>
        </div>
      )}

      {/* NO RESULTS */}
      {!isLoading && results.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[450] flex items-center justify-center">
          <div className="rounded-2xl bg-background/95 px-6 py-5 text-center shadow-xl backdrop-blur">
            <SearchIcon className="mx-auto h-7 w-7 text-muted-foreground" />

            <p className="mt-2 text-sm font-medium">No rooms match these filters</p>
          </div>
        </div>
      )}

      {/* SELECTED PROPERTY CARD */}
      {selectedProperty && (
        <div className="absolute inset-x-3 bottom-3 z-[600] max-w-sm sm:inset-x-4 sm:bottom-4">
          <div className="relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute -right-1 -top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-md"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>

            <PropertyCard property={selectedProperty} compact />
          </div>
        </div>
      )}
    </div>
  );

  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  const resetFilters = () => {
    setMaxRent(20000);

    setType("Any type");

    setAmenities([]);

    setFurnished(false);

    setVerifiedOnly(false);

    setAttached(false);

    setFood(false);

    setParking(false);

    setGender("Any");

    setQuery("");

    setSelected(null);
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Page footer={false}>
      {/* =====================================================
          SEARCH BAR
      ====================================================== */}

      <div className="border-b border-border bg-surface">
        <div className="container-page py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* CITY */}
            <button
              onClick={openLocationModal}
              className="flex min-w-0 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium sm:w-auto sm:justify-start"
            >
              <MapPin className="h-4 w-4 shrink-0 text-primary" />

              <span className="truncate">{activeCity ?? "Select city"}</span>
            </button>

            {/* SEARCH */}
            <div className="relative min-w-0 w-full flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search area, e.g. Gomti Nagar"
                className="h-11 w-full rounded-xl pl-9"
              />
            </div>

            {/* MOBILE FILTER BUTTON */}
            <Button
              variant="outline"
              className="w-full rounded-xl sm:w-auto lg:hidden"
              onClick={() => setShowFilters((value) => !value)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showFilters ? "Hide filters" : "Filters"}
            </Button>

            {/* VERIFIED */}
            <div className="ml-auto hidden items-center gap-1.5 text-sm text-muted-foreground lg:flex">
              <Star className="h-4 w-4 fill-warning text-warning" />
              Only verified owners
            </div>
          </div>

          {/* MOBILE FILTERS */}
          {showFilters && (
            <div className="card-surface mt-3 max-h-[60vh] overflow-y-auto overscroll-contain p-4 lg:hidden">
              {Filters}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          CITY NOT AVAILABLE
      ====================================================== */}

      {!available ? (
        <div className="container-page py-14">
          <ComingSoon city={activeCity} />
        </div>
      ) : (
        /* ===================================================
           MAIN CONTENT
        ==================================================== */

        <div className="container-page grid min-w-0 gap-5 py-4 sm:gap-6 sm:py-6 lg:grid-cols-[240px_minmax(0,1fr)_minmax(360px,460px)]">
          {/* =================================================
              DESKTOP FILTERS
          ================================================== */}

          <aside className="hidden lg:block">
            <div className="card-surface sticky top-20 p-5">{Filters}</div>
          </aside>

          {/* =================================================
              PROPERTY LIST
          ================================================== */}

          <section className={cn(mobileView === "map" && "hidden lg:block")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="min-w-0 text-lg font-bold sm:text-xl">
                {results.length} rooms in {activeCity ?? "your city"}
              </h1>

              <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
                Sorted by relevance
              </span>
            </div>

            {/* ERROR */}
            {loadError ? (
              <div className="card-surface mt-6 px-6 py-14 text-center">
                <h2 className="text-lg font-semibold">Unable to load rooms</h2>

                <p className="mt-1.5 text-sm text-muted-foreground">{loadError}</p>
              </div>
            ) : isLoading ? (
              /* LOADING */
              <div className="card-surface mt-6 px-6 py-14 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />

                <p className="mt-4 text-sm text-muted-foreground">
                  Loading currently listed rooms...
                </p>
              </div>
            ) : results.length === 0 ? (
              /* NO RESULTS */
              <div className="card-surface mt-6 px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <SearchIcon className="h-7 w-7 text-muted-foreground" />
                </div>

                <h2 className="mt-4 text-lg font-semibold">No rooms match these filters</h2>

                <p className="mt-1.5 text-sm text-muted-foreground">
                  Try increasing your budget or removing a few amenities.
                </p>

                <Button className="mt-5 rounded-xl" onClick={resetFilters}>
                  Reset filters
                </Button>
              </div>
            ) : (
              /* PROPERTY CARDS */
              <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {results.map((property) => (
                  <div key={property.id} onClick={() => setSelected(String(property.id))}>
                    <PropertyCard property={property} showDeposit />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* =================================================
              REAL MAP
          ================================================== */}

          <aside className={cn("lg:block", mobileView === "list" && "hidden")}>
            <div className="lg:sticky lg:top-20">{MapPanel}</div>
          </aside>
        </div>
      )}

      {/* =====================================================
          MOBILE MAP/LIST BUTTON
      ====================================================== */}

      {available && !isLoading && (
        <button
          onClick={() => setMobileView((value) => (value === "list" ? "map" : "list"))}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-[700] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-[var(--shadow-float)] sm:bottom-20 sm:px-5 sm:py-3 lg:hidden"
        >
          {mobileView === "list" ? <MapIcon className="h-4 w-4" /> : <List className="h-4 w-4" />}

          {mobileView === "list" ? "Map" : "List"}
        </button>
      )}

      {/* =====================================================
          MOBILE FOOTER
      ====================================================== */}

      <div className="container-page pb-24 pt-2 text-center text-sm text-muted-foreground lg:hidden">
        <Link to="/" className="text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </Page>
  );
}
