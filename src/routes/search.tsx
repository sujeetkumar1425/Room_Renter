import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { PROPERTIES, ROOM_TYPES, formatINR, shortINR, isCityAvailable } from "@/lib/data";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    city: typeof s.city === "string" ? s.city : undefined,
    type: typeof s.type === "string" ? s.type : undefined,
    budget: typeof s.budget === "string" ? s.budget : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search rooms in Lucknow — Room Renter" },
      {
        name: "description",
        content:
          "Browse verified rooms, PGs, studios and flats in Lucknow with live map, price filters and instant owner chat.",
      },
      { property: "og:title", content: "Search rooms in Lucknow — Room Renter" },
      { property: "og:description", content: "Filter verified rooms in Lucknow by price, type and amenities." },
    ],
  }),
  component: SearchPage,
});

const amenityFilters = ["Wi-Fi", "AC", "Parking", "Food", "Washing Machine", "Power Backup"];

function SearchPage() {
  const search = Route.useSearch();
  const { city, setCity, openLocationModal } = useApp();
  const activeCity = search.city ?? city;
  const available = isCityAvailable(activeCity);

  const [maxRent, setMaxRent] = useState(20000);
  const [type, setType] = useState(search.type && search.type !== "Any budget" ? search.type : "Any type");
  const [furnished, setFurnished] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [attached, setAttached] = useState(false);
  const [food, setFood] = useState(false);
  const [parking, setParking] = useState(false);
  const [gender, setGender] = useState("Any");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (search.city && search.city !== city) setCity(search.city);
  }, [search.city]);

  const results = useMemo(
    () =>
      PROPERTIES.filter((p) => {
        if (p.rent > maxRent) return false;
        if (type !== "Any type" && p.roomType !== type) return false;
        if (furnished && p.furnished !== "Fully Furnished") return false;
        if (verifiedOnly && !p.verified) return false;
        if (attached && p.bathroom !== "Attached") return false;
        if (food && !p.food) return false;
        if (parking && !p.parking) return false;
        if (gender !== "Any" && p.gender !== "Any" && p.gender !== gender) return false;
        if (amenities.some((a) => !p.amenities.includes(a))) return false;
        if (query && !(p.title + p.area).toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [maxRent, type, furnished, verifiedOnly, attached, food, parking, gender, amenities, query],
  );

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const selectedProperty = results.find((p) => p.id === selected);

  const Filters = (
    <div className="space-y-6">
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
          onValueChange={(v) => setMaxRent(v[0])}
        />
      </div>

      <div>
        <Label className="text-sm font-semibold">Room type</Label>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {ROOM_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                type === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Amenities</Label>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {amenityFilters.map((a) => (
            <button
              key={a}
              onClick={() => toggleAmenity(a)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                amenities.includes(a)
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Gender preference</Label>
        <div className="mt-2.5 flex gap-2">
          {["Any", "Male", "Female"].map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                gender === g
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        {[
          { label: "Fully furnished", value: furnished, set: setFurnished },
          { label: "Attached bathroom", value: attached, set: setAttached },
          { label: "Food included", value: food, set: setFood },
          { label: "Parking", value: parking, set: setParking },
          { label: "Verified only", value: verifiedOnly, set: setVerifiedOnly },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <Label className="text-sm font-normal">{row.label}</Label>
            <Switch checked={row.value} onCheckedChange={row.set} />
          </div>
        ))}
      </div>
    </div>
  );

  const MapPanel = (
    <div className="relative h-[70vh] overflow-hidden rounded-2xl border border-border bg-[oklch(0.95_0.02_190)] lg:h-[calc(100vh-9rem)]">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.9 0.02 190) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0.02 190) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute left-[-10%] top-[45%] h-24 w-[130%] -rotate-6 rounded-full bg-[oklch(0.86_0.05_220)]/70" />
      <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">
        Lucknow · {results.length} rooms
      </span>

      {results.map((p) => (
        <button
          key={p.id}
          style={{ top: p.coords.top, left: p.coords.left }}
          onClick={() => setSelected(p.id)}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-float)] transition-transform hover:scale-110",
            selected === p.id
              ? "bg-foreground text-background"
              : "bg-background text-foreground ring-1 ring-primary/30",
          )}
        >
          {shortINR(p.rent)}
        </button>
      ))}

      {selectedProperty && (
        <div className="absolute inset-x-4 bottom-4 max-w-sm">
          <div className="relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute -top-3 right-0 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-[var(--shadow-soft)]"
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

  return (
    <Page footer={false}>
      {/* search bar */}
      <div className="border-b border-border bg-surface">
        <div className="container-page py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openLocationModal}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium"
            >
              <MapPin className="h-4 w-4 text-primary" /> {activeCity ?? "Select city"}
            </button>
            <div className="relative min-w-[200px] flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search area, e.g. Gomti Nagar"
                className="h-11 rounded-xl pl-9"
              />
            </div>
            <Button
              variant="outline"
              className="rounded-xl lg:hidden"
              onClick={() => setShowFilters((s) => !s)}
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
            <div className="ml-auto hidden items-center gap-1.5 text-sm text-muted-foreground lg:flex">
              <Star className="h-4 w-4 fill-warning text-warning" /> Only verified owners
            </div>
          </div>
          {showFilters && (
            <div className="card-surface mt-3 p-4 lg:hidden">{Filters}</div>
          )}
        </div>
      </div>

      {!available ? (
        <div className="container-page py-14">
          <ComingSoon city={activeCity} />
        </div>
      ) : (
        <div className="container-page grid gap-6 py-6 lg:grid-cols-[260px_1fr_460px]">
          <aside className="hidden lg:block">
            <div className="card-surface sticky top-20 p-5">{Filters}</div>
          </aside>

          <section className={cn(mobileView === "map" && "hidden lg:block")}>
            <div className="flex items-baseline justify-between">
              <h1 className="text-xl font-bold">
                {results.length} rooms in Lucknow
              </h1>
              <span className="text-sm text-muted-foreground">Sorted by relevance</span>
            </div>
            {results.length === 0 ? (
              <div className="card-surface mt-6 px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <SearchIcon className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">No rooms match these filters</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Try increasing your budget or removing a few amenities.
                </p>
                <Button
                  className="mt-5 rounded-xl"
                  onClick={() => {
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
                  }}
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {results.map((p) => (
                  <PropertyCard key={p.id} property={p} showDeposit />
                ))}
              </div>
            )}
          </section>

          <aside className={cn("lg:block", mobileView === "list" && "hidden")}>
            <div className="lg:sticky lg:top-20">{MapPanel}</div>
          </aside>
        </div>
      )}

      {available && (
        <button
          onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}
          className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-[var(--shadow-float)] lg:hidden"
        >
          {mobileView === "list" ? <MapIcon className="h-4 w-4" /> : <List className="h-4 w-4" />}
          {mobileView === "list" ? "Map" : "List"}
        </button>
      )}

      <div className="container-page pb-10 text-center text-sm text-muted-foreground lg:hidden">
        <Link to="/" className="text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </Page>
  );
}
