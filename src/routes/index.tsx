import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin,
  CalendarDays,
  Wallet,
  BedDouble,
  Search as SearchIcon,
  ShieldCheck,
  FileSignature,
  MessagesSquare,
  KeyRound,
  Navigation,
  Check,
} from "lucide-react";
import { Page } from "@/components/Layout";
import { PropertyCard } from "@/components/PropertyCard";
import { ComingSoon } from "@/components/ComingSoon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CITIES, PROPERTIES, ROOM_TYPES } from "@/lib/data";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Room Renter — Find verified rooms & flats in Lucknow" },
      {
        name: "description",
        content:
          "Discover verified rooms, PGs and flats near your college or workplace in Lucknow. Chat with owners, book visits and sign rental agreements online.",
      },
      { property: "og:title", content: "Room Renter — Rooms that feel like home" },
      {
        property: "og:description",
        content: "Verified rooms, flats and shared spaces in Lucknow with online rental agreements.",
      },
    ],
  }),
  component: HomePage,
});

const journey = [
  { icon: MapPin, label: "Location", text: "Share your location" },
  { icon: SearchIcon, label: "Find", text: "Browse verified rooms" },
  { icon: KeyRound, label: "Visit", text: "Book a free visit" },
  { icon: MessagesSquare, label: "Agree", text: "Chat and finalise" },
  { icon: FileSignature, label: "Agreement", text: "Create & sign online" },
];

function HomePage() {
  const { city, cityAvailable, ready, openLocationModal, setCity } = useApp();
  const navigate = useNavigate();
  const [budget, setBudget] = useState("Any budget");
  const [type, setType] = useState("Any type");
  const [date, setDate] = useState("");

  const suggested = [...PROPERTIES].sort((a, b) => b.rating - a.rating).slice(0, 6);

  const runSearch = () => {
    if (!city) return openLocationModal();
    navigate({ to: "/search", search: { city, type, budget } });
  };

  return (
    <Page>
      {/* HERO */}
      <section className="hero-gradient border-b border-border/60">
        <div className="container-page py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Live in Lucknow · 1,240+ verified rooms
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Find a room that feels like home.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Discover verified rooms, flats and shared spaces near your college, workplace or
              preferred location.
            </p>
          </div>

          {/* SEARCH */}
          <div className="card-surface mx-auto mt-8 max-w-5xl p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
              <button
                onClick={openLocationModal}
                className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3 text-left transition-colors hover:bg-muted"
              >
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Location
                  </span>
                  <span className="block truncate text-sm font-medium">
                    {city ?? "Select your city"}
                  </span>
                </span>
              </button>

              <label className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2 transition-colors focus-within:border-primary">
                <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Move-in date
                  </span>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-6 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                  />
                </span>
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2">
                <Wallet className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Budget
                  </span>
                  <Select value={budget} onValueChange={setBudget}>
                    <SelectTrigger className="h-6 border-0 p-0 text-sm shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Any budget", "Under ₹6,000", "₹6,000 – ₹10,000", "₹10,000 – ₹15,000", "₹15,000+"].map(
                        (b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2">
                <BedDouble className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Room type
                  </span>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-6 border-0 p-0 text-sm shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button size="lg" className="h-auto rounded-xl px-6 py-3.5" onClick={runSearch}>
                <SearchIcon className="h-4 w-4" /> Search Rooms
              </Button>
            </div>

            {!city && (
              <button
                onClick={openLocationModal}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground"
              >
                <Navigation className="h-4 w-4" /> Turn on location to see rooms near you
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SUGGESTED ROOMS */}
      <section className="container-page py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Suggested Rooms for You</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Rooms selected based on your location and preferences.
            </p>
          </div>
          {cityAvailable && (
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/search" search={{ city: "Lucknow" }}>
                View all rooms
              </Link>
            </Button>
          )}
        </div>

        <div className="mt-6">
          {!ready ? (
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
          ) : (
            <>
              {cityAvailable && (
                <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
                  <Check className="h-4 w-4" /> Rooms available in Lucknow
                </p>
              )}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {suggested.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CITIES */}
      <section className="border-y border-border bg-surface py-12">
        <div className="container-page">
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
                  navigate({ to: "/search", search: { city: c.name } });
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

      {/* JOURNEY */}
      <section className="container-page py-14">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">How Room Renter works</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          From finding a room to signing the agreement — everything in one place.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {journey.map((s, i) => (
            <div key={s.label} className="card-surface p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step {i + 1}
              </p>
              <p className="text-base font-semibold">{s.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-xl">
            <Link to="/search" search={{ city: "Lucknow" }}>Find a Room</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl">
            <Link to="/list-property">List Your Property</Link>
          </Button>
        </div>
      </section>
    </Page>
  );
}
