import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MapPin,
  Search as SearchIcon,
  ShieldCheck,
  FileSignature,
  MessagesSquare,
  KeyRound,
  Navigation,
  Check,
  SlidersHorizontal,
} from "lucide-react";

import { Page } from "@/components/Layout";
import { PropertyCard } from "@/components/PropertyCard";
import { ComingSoon } from "@/components/ComingSoon";
import { FiltersPanel } from "@/components/FiltersPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { CITIES } from "@/lib/data";
import { fetchListedProperties, type Property } from "@/lib/properties";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Room Renter — Find verified rooms & flats",
      },
      {
        name: "description",
        content: "Discover verified rooms, PGs and flats near your college or workplace.",
      },
      {
        property: "og:title",
        content: "Room Renter — Rooms that feel like home",
      },
      {
        property: "og:description",
        content: "Verified rooms, flats and shared spaces near you.",
      },
    ],
  }),

  component: HomePage,
});

/* =========================================================
   HOW ROOM RENTER WORKS
========================================================= */

const journey = [
  {
    icon: MapPin,
    label: "Location",
    text: "Share your location",
  },
  {
    icon: SearchIcon,
    label: "Find",
    text: "Browse listed rooms",
  },
  {
    icon: KeyRound,
    label: "Visit",
    text: "Book a free visit",
  },
  {
    icon: MessagesSquare,
    label: "Agree",
    text: "Chat and finalise",
  },
  {
    icon: FileSignature,
    label: "Agreement",
    text: "Create & sign online",
  },
];

/* =========================================================
   HOME PAGE
========================================================= */

function HomePage() {
  const { city, cityAvailable, ready, openLocationModal, setCity } = useApp();

  const navigate = useNavigate();

  const [filtersOpen, setFiltersOpen] = useState(false);

  /* -------------------------------------------------------
     DATABASE PROPERTIES
  ------------------------------------------------------- */

  const [properties, setProperties] = useState<Property[]>([]);

  const [propertiesLoading, setPropertiesLoading] = useState(true);

  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  /* -------------------------------------------------------
     LOAD PROPERTIES FROM SUPABASE
  ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadProperties = async () => {
      try {
        setPropertiesLoading(true);
        setPropertiesError(null);

        const data = await fetchListedProperties(city || undefined);

        if (!cancelled) {
          setProperties(data);
        }
      } catch (error) {
        console.error("Error loading properties:", error);

        if (!cancelled) {
          setPropertiesError("Unable to load listed properties.");
        }
      } finally {
        if (!cancelled) {
          setPropertiesLoading(false);
        }
      }
    };

    loadProperties();

    return () => {
      cancelled = true;
    };
  }, [city]);

  /* -------------------------------------------------------
     SHOW ONLY FIRST 6 PROPERTIES ON HOME
  ------------------------------------------------------- */

  const suggested = properties.slice(0, 6);

  return (
    <Page>
      {/* ===================================================
          HERO
      =================================================== */}

      <section className="hero-gradient border-b border-border/60">
        <div className="container-page px-4 py-6 sm:py-12 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              {city ? `Live in ${city}` : "Find a room near you"}
            </span>

            <h1 className="mt-3 text-3xl font-extrabold leading-[1.1] sm:mt-5 sm:text-5xl lg:text-6xl">
              Find a room that feels like home.
            </h1>
          </div>

          {/* SEARCH */}

          <div className="mt-5 flex flex-col items-center sm:mt-8">
            <Button
              size="lg"
              className="h-auto w-full max-w-xs rounded-full px-6 py-3 text-base shadow-[var(--shadow-card)] sm:w-auto sm:max-w-none sm:py-4"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-5 w-5" />
              Filters &amp; Search
            </Button>

            <p className="mt-1 text-xs italic text-muted-foreground sm:mt-2">
              All your filters in one place
            </p>

            {!city && (
              <button
                onClick={openLocationModal}
                className="mt-3 w-full max-w-sm flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground sm:mt-4"
              >
                <Navigation className="h-4 w-4" />
                Turn on location to see rooms near you
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================
          FILTERS
      =================================================== */}

      <FiltersPanel open={filtersOpen} onOpenChange={setFiltersOpen} />

      {/* ===================================================
          LISTED ROOMS
      =================================================== */}

      <section className="container-page px-4 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Listed Rooms</h2>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Properties currently listed by landlords.
            </p>
          </div>

          {cityAvailable && (
            <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
              <Link
                to="/search"
                search={{
                  city: city || undefined,
                  type: undefined,
                  budget: undefined,
                }}
              >
                View all rooms
              </Link>
            </Button>
          )}
        </div>

        {/* =================================================
            PROPERTY CONTENT
        ================================================= */}

        <div className="mt-6">
          {/* LOADING */}

          {propertiesLoading || !ready ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card-surface overflow-hidden">
                  <Skeleton className="h-52 w-full" />

                  <div className="space-y-3 p-4">
                    <Skeleton className="h-4 w-3/4" />

                    <Skeleton className="h-3 w-1/2" />

                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : city && !cityAvailable ? (
            <ComingSoon city={city} />
          ) : propertiesError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center sm:p-6">
              <p className="font-semibold text-destructive">{propertiesError}</p>

              <p className="mt-1 text-sm text-muted-foreground">Please try again later.</p>
            </div>
          ) : (
            <>
              {cityAvailable && (
                <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
                  <Check className="h-4 w-4" />
                  Rooms available in Lucknow
                </p>
              )}

              {/* NO PROPERTIES */}

              {suggested.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center sm:p-10">
                  <SearchIcon className="mx-auto h-10 w-10 text-muted-foreground" />

                  <h3 className="mt-4 text-lg font-semibold">No properties listed yet</h3>

                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    There are currently no available properties listed by landlords. Please check
                    again later.
                  </p>

                  <Button asChild className="mt-5 w-full rounded-xl sm:w-auto">
                    <Link to="/list-property">List Your Property</Link>
                  </Button>
                </div>
              ) : (
                /* PROPERTY CARDS */

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {suggested.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===================================================
          CITIES
      =================================================== */}

      <section className="border-y border-border bg-surface py-10 sm:py-12">
        <div className="container-page px-4">
          <h2 className="text-2xl font-bold sm:text-3xl">Cities on Room Renter</h2>

          <p className="mt-1.5 text-sm text-muted-foreground">
            We launch city by city so every listing stays verified.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CITIES.map((c) => (
              <button
                key={c.name}
                disabled={!c.available}
                onClick={() => {
                  setCity(c.name);

                  navigate({
                    to: "/search",
                    search: {
                      city: c.name,
                      type: undefined,
                      budget: undefined,
                    },
                  });
                }}
                className={cn(
                  "flex items-center justify-between rounded-2xl border p-4 text-left transition-all",

                  c.available
                    ? "border-primary/30 bg-background shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)]"
                    : "cursor-not-allowed border-border bg-muted/50 opacity-60",
                )}
              >
                <span>
                  <span className="block font-semibold">{c.name}</span>

                  <span className="block text-xs text-muted-foreground">{c.state}</span>
                </span>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",

                    c.available
                      ? "bg-success/12 text-success"
                      : "bg-background text-muted-foreground",
                  )}
                >
                  {c.available ? "Available Now ✓" : "Coming Soon"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================
          HOW ROOM RENTER WORKS
      =================================================== */}

      <section className="container-page px-4 py-12 sm:py-14">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">How Room Renter works</h2>

        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          From finding a room to signing the agreement — everything in one place.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {journey.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.label} className="card-surface p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </div>

                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Step {index + 1}
                </p>

                <p className="text-base font-semibold">{step.label}</p>

                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full rounded-xl sm:w-auto">
            <Link
              to="/search"
              search={{
                city: city || undefined,
                type: undefined,
                budget: undefined,
              }}
            >
              Find a Room
            </Link>
          </Button>

          <Button asChild size="lg" variant="outline" className="w-full rounded-xl sm:w-auto">
            <Link to="/list-property">List Your Property</Link>
          </Button>
        </div>
      </section>
    </Page>
  );
}
