import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  BedDouble,
  Building2,
  Home as HomeIcon,
  House,
  Users,
  Navigation,
  Search as SearchIcon,
} from "lucide-react";

import { Page } from "@/components/Layout";
import { PropertyCard } from "@/components/PropertyCard";
import { ComingSoon } from "@/components/ComingSoon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchListedProperties, type Property } from "@/lib/properties";
import { useApp } from "@/lib/app-context";

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

const roomTypes = [
  {
    icon: BedDouble,
    title: "Single Room",
    text: "Private room",
  },
  {
    icon: Users,
    title: "PG",
    text: "Shared living",
  },
  {
    icon: Building2,
    title: "Flat",
    text: "1 & 2 BHK",
  },
  {
    icon: House,
    title: "Studio",
    text: "Compact home",
  },
];

function HomePage() {
  const { city, cityAvailable, ready, openLocationModal } = useApp();

  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

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
          setPropertiesError("Unable to load rooms right now.");
        }
      } finally {
        if (!cancelled) {
          setPropertiesLoading(false);
        }
      }
    };

    void loadProperties();

    return () => {
      cancelled = true;
    };
  }, [city]);

  const suggested = properties.slice(0, 6);

  const roomTypes = [
    {
      title: "Single Room",
      subtitle: "Private room",
      image: "/roomrenter/single-room.png",
    },
    {
      title: "PG",
      subtitle: "Shared living",
      image: "/roomrenter/pg-room.png",
    },
    {
      title: "Flat",
      subtitle: "1 & 2 BHK",
      image: "/roomrenter/flat-room.png",
    },
    {
      title: "Studio",
      subtitle: "Compact home",
      image: "/roomrenter/studio-room.png",
    },
  ];

  return (
    <Page>
      {/* ===================================================
          HERO
      =================================================== */}

      <section className="hero-gradient border-b border-border/60">
        <div className="container-page px-4 py-6 sm:py-10 lg:py-12">
          <div className="relative min-h-[178px] overflow-hidden rounded-[24px] border border-primary/10 bg-background/90 px-4 py-5 shadow-[var(--shadow-card)] sm:min-h-[240px] sm:rounded-[28px] sm:px-8 sm:py-8">
            <div className="relative z-10 max-w-[58%] sm:max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary">
                <Navigation className="h-3.5 w-3.5" />
                {city ? `Rooms available in ${city}` : "Find a room near you"}
              </span>

              <h1 className="mt-2 max-w-[190px] text-[22px] font-extrabold leading-[1.02] tracking-tight sm:mt-4 sm:max-w-lg sm:text-5xl sm:leading-[1.08]">
                Find a room that feels like home.
              </h1>

              <p className="mt-2 max-w-[205px] text-[10px] leading-4 text-muted-foreground sm:mt-3 sm:max-w-lg sm:text-base sm:leading-6">
                Discover verified rooms, PGs and flats that match your needs.
              </p>

              <Button
                asChild
                size="lg"
                className="mt-3 h-9 w-full max-w-[240px] rounded-full text-[11px] font-bold shadow-[var(--shadow-card)] sm:mt-5 sm:h-12 sm:w-auto sm:px-10 sm:text-sm"
              >
                <Link
                  to="/search"
                  search={{
                    city: city || undefined,
                    type: undefined,
                    budget: undefined,
                  }}
                >
                  <SearchIcon className="mr-2 h-5 w-5" />
                  Search Rooms
                </Link>
              </Button>

              {!city ? (
                <button
                  type="button"
                  onClick={openLocationModal}
                  className="mt-1 flex items-center gap-1.5 rounded-xl px-1 py-1.5 text-[9px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:mt-3 sm:gap-2 sm:py-2 sm:text-xs"
                >
                  <Navigation className="h-3.5 w-3.5 text-primary" />
                  Turn on location to see nearby rooms
                </button>
              ) : null}
            </div>

            {/* Hero room image */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-[48%] overflow-hidden sm:w-[43%]">
              <img src="/roomrenter/hero-room.png" alt="" className="h-full w-full object-cover" />

              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/45 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          EXPLORE BY ROOM TYPE
      =================================================== */}

      <section className="container-page px-4 py-4 sm:py-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight sm:text-2xl">Explore by room type</h2>

            <p className="mt-0.5 text-[9px] text-muted-foreground sm:mt-1 sm:text-sm">
              Find a space that fits your lifestyle.
            </p>
          </div>

          <Link
            to="/search"
            search={{
              city: city || undefined,
              type: undefined,
              budget: undefined,
            }}
            className="shrink-0 text-[9px] font-semibold text-primary sm:text-sm"
          >
            View all →
          </Link>
        </div>

        {/* EXACTLY ONE ROW ON MOBILE */}
        <div className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:gap-3">
          {roomTypes.map((roomType) => {
            const Icon =
              roomType.title === "Single Room"
                ? BedDouble
                : roomType.title === "PG"
                  ? Users
                  : roomType.title === "Flat"
                    ? Building2
                    : House;

            return (
              <Link
                key={roomType.title}
                to="/search"
                search={{
                  city: city || undefined,
                  type: roomType.title,
                  budget: undefined,
                }}
                className="group overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30"
              >
                <div className="relative aspect-[1.08/1] overflow-hidden bg-muted">
                  {roomType.image ? (
                    <img
                      src={roomType.image}
                      alt={roomType.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-primary/5">
                      <Icon className="h-6 w-6 text-primary/60" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

                  <span className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-primary shadow-sm">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="px-1.5 py-2 text-center sm:px-2 sm:py-2.5">
                  <p className="truncate text-[9px] font-bold leading-tight sm:text-xs">
                    {roomType.title === "Single Room" ? "Single Room" : roomType.title}
                  </p>

                  <p className="mt-0.5 truncate text-[7px] leading-tight text-muted-foreground sm:text-[10px]">
                    {roomType.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===================================================
          AVAILABLE ROOMS
      =================================================== */}

      <section className="container-page px-4 pb-10 sm:pb-14">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight sm:text-2xl">Available Rooms</h2>

            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Explore rooms currently available on Room Renter.
            </p>
          </div>

          <Link
            to="/search"
            search={{
              city: city || undefined,
              type: undefined,
              budget: undefined,
            }}
            className="shrink-0 text-sm font-semibold text-primary"
          >
            View all →
          </Link>
        </div>

        <div className="mt-4">
          {propertiesLoading || !ready ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <Skeleton className="h-48 w-full sm:h-52" />

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
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
              <SearchIcon className="mx-auto h-8 w-8 text-destructive/70" />

              <p className="mt-3 font-semibold text-destructive">{propertiesError}</p>

              <p className="mt-1 text-xs text-muted-foreground">Please try again in a moment.</p>
            </div>
          ) : suggested.length === 0 ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-7 text-center">
              <HomeIcon className="mx-auto h-9 w-9 text-muted-foreground" />

              <h3 className="mt-3 font-semibold">No rooms available yet</h3>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                We couldn't find any rooms for this location right now. Try another area or check
                again later.
              </p>

              <Button asChild variant="outline" className="mt-4 rounded-xl">
                <Link
                  to="/search"
                  search={{
                    city: undefined,
                    type: undefined,
                    budget: undefined,
                  }}
                >
                  Explore Rooms
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {cityAvailable ? (
                <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                  <Check className="h-3.5 w-3.5" />
                  Rooms available in {city}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suggested.map((property) => (
                  <PropertyCard key={property.id} property={property} horizontal />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </Page>
  );
}
