import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  Star,
  MapPin,
  Heart,
  Share2,
  BadgeCheck,
  Wifi,
  Snowflake,
  WashingMachine,
  CookingPot,
  Car,
  ShowerHead,
  BatteryCharging,
  UtensilsCrossed,
  Phone,
  CalendarCheck,
  FileSignature,
  ShieldCheck,
} from "lucide-react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getProperty, formatINR, PROPERTIES } from "@/lib/data";
import { PropertyCard } from "@/components/PropertyCard";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/property/$id")({
  loader: ({ params }) => {
    const property = getProperty(params.id);
    if (!property) throw notFound();
    return { property };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Room unavailable — Room Renter" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.property;
    const title = `${p.title} — ${formatINR(p.rent)}/month | Room Renter`;
    const description = `${p.roomType} in ${p.area}, ${p.city}. ${p.furnished}, deposit ${formatINR(p.deposit)}. Rated ${p.rating} by ${p.reviews} renters.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: PropertyNotFound,
  component: PropertyPage,
});

function PropertyNotFound() {
  return (
    <Page>
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">This property is no longer available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The listing may have been rented out or paused by the owner.
        </p>
        <Button asChild className="mt-6 rounded-xl">
          <Link to="/search" search={{ city: "Lucknow" }}>Browse other rooms</Link>
        </Button>
      </div>
    </Page>
  );
}

const amenityIcons: Record<string, typeof Wifi> = {
  "Wi-Fi": Wifi,
  AC: Snowflake,
  "Washing Machine": WashingMachine,
  Kitchen: CookingPot,
  Parking: Car,
  "Attached Bathroom": ShowerHead,
  "Shared Bathroom": ShowerHead,
  "Power Backup": BatteryCharging,
  Food: UtensilsCrossed,
};

const badges = ["Identity Verified", "Owner Verified", "Property Verified"];

function PropertyPage() {
  const { property } = Route.useLoaderData();
  const { isSaved, toggleSaved } = useApp();
  const [active, setActive] = useState(0);
  const saved = isSaved(property.id);

  const breakdown = [
    { label: "Cleanliness", value: 92 },
    { label: "Location", value: 88 },
    { label: "Owner support", value: 95 },
    { label: "Value for money", value: 84 },
  ];

  const similar = PROPERTIES.filter((p) => p.id !== property.id).slice(0, 3);

  return (
    <Page>
      <div className="container-page py-6">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link> ·{" "}
          <Link to="/search" search={{ city: "Lucknow" }} className="hover:text-primary">Lucknow rooms</Link> ·{" "}
          <span className="text-foreground">{property.area}</span>
        </nav>

        {/* GALLERY */}
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={property.images[active]}
              alt={property.title}
              width={1200}
              height={800}
              className="h-[280px] w-full object-cover sm:h-[420px]"
            />
            <div className="absolute right-3 top-3 flex gap-2">
              <button
                onClick={() => toggleSaved(property.id)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-[var(--shadow-soft)]"
                aria-label="Save"
              >
                <Heart className={cn("h-5 w-5", saved && "fill-destructive text-destructive")} />
              </button>
              <button
                onClick={() => toast.success("Listing link copied")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-[var(--shadow-soft)]"
                aria-label="Share"
              >
                <Share2 className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 lg:grid-cols-2">
            {property.images.map((img, i) => (
              <button
                key={img + i}
                onClick={() => setActive(i)}
                className={cn(
                  "overflow-hidden rounded-xl border-2 transition-all",
                  active === i ? "border-primary" : "border-transparent opacity-85",
                )}
              >
                <img
                  src={img}
                  alt={`${property.title} photo ${i + 1}`}
                  width={1200}
                  height={800}
                  loading="lazy"
                  className="h-20 w-full object-cover lg:h-[calc((420px-0.75rem)/2)]"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                {property.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" /> Property Verified
                  </span>
                )}
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {property.available}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{property.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-semibold text-foreground">{property.rating}</span> (
                  {property.reviews} reviews)
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {property.area}, {property.city}
                </span>
                <span>{property.distance}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { k: "Room type", v: property.roomType },
                  { k: "Furnishing", v: property.furnished },
                  { k: "Occupancy", v: property.occupancy },
                  { k: "Preferred", v: property.gender === "Any" ? "Anyone" : property.gender },
                ].map((x) => (
                  <div key={x.k} className="rounded-xl bg-muted px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{x.k}</p>
                    <p className="text-sm font-semibold">{x.v}</p>
                  </div>
                ))}
              </div>
            </header>

            <section>
              <h2 className="text-lg font-bold">Amenities</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {property.amenities.map((a) => {
                  const Icon = amenityIcons[a] ?? ShieldCheck;
                  return (
                    <div key={a} className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                      <span className="text-sm font-medium">{a}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold">About this room</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{property.description}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold">Location & nearby</h2>
              <div className="relative mt-3 h-56 overflow-hidden rounded-2xl border border-border bg-[oklch(0.95_0.02_190)]">
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    backgroundImage:
                      "linear-gradient(oklch(0.9 0.02 190) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0.02 190) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                  }}
                />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background shadow-[var(--shadow-float)]">
                  {property.area}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {property.nearby.map((n) => (
                  <div key={n.name} className="flex items-center justify-between rounded-xl bg-muted px-3.5 py-2.5 text-sm">
                    <span>{n.name}</span>
                    <span className="font-medium text-muted-foreground">{n.distance}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold">Reviews & trust</h2>
              <div className="mt-3 grid gap-5 rounded-2xl border border-border p-5 sm:grid-cols-[160px_1fr]">
                <div className="text-center sm:text-left">
                  <p className="text-4xl font-extrabold">{property.rating}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{property.reviews} reviews</p>
                  <div className="mt-2 flex justify-center gap-0.5 sm:justify-start">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i <= Math.round(property.rating) ? "fill-warning text-warning" : "text-border",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5">
                  {breakdown.map((b) => (
                    <div key={b.label} className="flex items-center gap-3">
                      <span className="w-32 text-sm text-muted-foreground">{b.label}</span>
                      <Progress value={b.value} className="h-2 flex-1" />
                      <span className="w-9 text-right text-xs font-medium">{(b.value / 20).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {property.reviewList.map((r) => (
                  <div key={r.name} className="card-surface p-4">
                    <div className="flex items-center gap-3">
                      <img src={r.avatar} alt={r.name} width={40} height={40} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-semibold">
                          {r.name}{" "}
                          <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                            Verified Renter
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{r.date} · ★ {r.rating}.0</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="card-surface p-5">
              <p className="text-3xl font-extrabold">
                {formatINR(property.rent)}
                <span className="text-base font-medium text-muted-foreground">/month</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Security deposit {formatINR(property.deposit)}
              </p>
              <div className="mt-4 space-y-2">
                <Button asChild size="lg" className="w-full rounded-xl">
                  <Link to="/messages">
                    <Phone className="h-4 w-4" /> Contact Owner
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full rounded-xl">
                  <Link to="/visits">
                    <CalendarCheck className="h-4 w-4" /> Schedule Visit
                  </Link>
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                No brokerage. Owner responds {property.landlord.responseTime}.
              </p>
            </div>

            <div className="card-surface border-primary/25 bg-accent/40 p-5">
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" />
                <h3 className="font-bold">Rental Agreement</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a rental agreement with your landlord before moving in.
              </p>
              <Button asChild className="mt-4 w-full rounded-xl">
                <Link to="/agreement">Create Agreement</Link>
              </Button>
            </div>

            <div className="card-surface p-5">
              <div className="flex items-center gap-3">
                <img
                  src={property.landlord.photo}
                  alt={property.landlord.name}
                  width={56}
                  height={56}
                  loading="lazy"
                  className="h-14 w-14 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">{property.landlord.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {property.landlord.rating} ·
                    Owner since {property.landlord.since}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span key={b} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {b}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-muted px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Response rate</p>
                  <p className="font-semibold">{property.landlord.responseRate}%</p>
                </div>
                <div className="rounded-xl bg-muted px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Responds in</p>
                  <p className="font-semibold">{property.landlord.responseTime}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-bold">Similar rooms in Lucknow</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      </div>

      {/* mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <Button asChild variant="outline" className="flex-1 rounded-xl">
          <Link to="/messages">Contact</Link>
        </Button>
        <Button asChild className="flex-1 rounded-xl">
          <Link to="/visits">Schedule Visit</Link>
        </Button>
      </div>
    </Page>
  );
}
