import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Star, BadgeCheck } from "lucide-react";
import type { Property } from "@/lib/properties";
import { formatINR } from "@/lib/data";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export function PropertyCard({
  property,
  compact = false,
  showDeposit = false,
  horizontal = false,
}: {
  property: Property;
  compact?: boolean;
  showDeposit?: boolean;
  horizontal?: boolean;
}) {
  const { isSaved, toggleSaved } = useApp();
  const saved = isSaved(property.id);

  if (horizontal) {
    return (
      <div className="group card-surface overflow-hidden transition-shadow hover:shadow-[var(--shadow-float)]">
        <div className="grid grid-cols-[42%_58%] sm:grid-cols-[38%_62%]">
          {/* IMAGE */}
          <div className="relative min-h-[138px]">
            <Link to="/property/$id" params={{ id: property.id }} className="block h-full">
              <img
                src={property.images[0]}
                alt={property.title}
                width={1200}
                height={800}
                loading="lazy"
                className="h-full min-h-[138px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </Link>

            {property.verified && (
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[9px] font-semibold text-primary shadow-[var(--shadow-soft)] sm:text-[11px]">
                <BadgeCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Verified
              </span>
            )}

            <button
              type="button"
              aria-label={saved ? "Remove from saved" : "Save room"}
              onClick={() => toggleSaved(property.id)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/95 shadow-[var(--shadow-soft)] transition-transform active:scale-90 sm:right-3 sm:top-3 sm:h-9 sm:w-9"
            >
              <Heart
                className={cn(
                  "h-4 w-4 sm:h-[18px] sm:w-[18px]",
                  saved ? "fill-destructive text-destructive" : "text-foreground/70",
                )}
              />
            </button>
          </div>

          {/* DETAILS */}
          <div className="min-w-0 space-y-1.5 p-3 sm:space-y-2.5 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <Link
                to="/property/$id"
                params={{ id: property.id }}
                className="line-clamp-2 min-w-0 text-xs font-bold leading-snug hover:text-primary sm:text-base"
              >
                {property.title}
              </Link>

              <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold sm:gap-1 sm:text-sm">
                <Star className="h-3 w-3 fill-warning text-warning sm:h-3.5 sm:w-3.5" />
                {property.reviews > 0 ? property.rating.toFixed(1) : "New"}
              </span>
            </div>

            <p className="flex items-center gap-1 text-[9px] text-muted-foreground sm:gap-1.5 sm:text-sm">
              <MapPin className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="truncate">
                {property.area}, {property.city}
              </span>
            </p>

            <div className="flex flex-wrap gap-1">
              <span className="rounded-full bg-muted px-2 py-1 text-[8px] font-medium text-muted-foreground sm:px-2.5 sm:text-[11px]">
                {property.roomType}
              </span>

              {property.amenities.slice(0, 2).map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-muted px-2 py-1 text-[8px] font-medium text-muted-foreground sm:px-2.5 sm:text-[11px]"
                >
                  {a}
                </span>
              ))}
            </div>

            <div className="flex items-end justify-between gap-2 pt-0.5 sm:pt-1">
              <div className="min-w-0">
                <p className="text-sm font-bold sm:text-lg">
                  {formatINR(property.rent)}
                  <span className="text-[9px] font-medium text-muted-foreground sm:text-sm">
                    /month
                  </span>
                </p>

                <p className="truncate text-[8px] text-muted-foreground sm:text-[11px]">
                  {showDeposit ? `Deposit ${formatINR(property.deposit)}` : property.distance}
                </p>
              </div>

              <Link
                to="/property/$id"
                params={{ id: property.id }}
                className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[9px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-sm"
              >
                View Details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group card-surface overflow-hidden transition-shadow hover:shadow-[var(--shadow-float)]">
      <div className="relative">
        <Link to="/property/$id" params={{ id: property.id }}>
          <img
            src={property.images[0]}
            alt={property.title}
            width={1200}
            height={800}
            loading="lazy"
            className={cn(
              "w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]",
              compact ? "h-40" : "h-52",
            )}
          />
        </Link>

        {property.verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-[var(--shadow-soft)]">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        )}

        <button
          type="button"
          aria-label={saved ? "Remove from saved" : "Save room"}
          onClick={() => toggleSaved(property.id)}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/95 shadow-[var(--shadow-soft)] transition-transform active:scale-90"
        >
          <Heart
            className={cn(
              "h-[18px] w-[18px]",
              saved ? "fill-destructive text-destructive" : "text-foreground/70",
            )}
          />
        </button>
      </div>

      <div className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <Link
            to="/property/$id"
            params={{ id: property.id }}
            className="line-clamp-1 font-semibold leading-snug hover:text-primary"
          >
            {property.title}
          </Link>

          <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            {property.reviews > 0 ? property.rating.toFixed(1) : "New"}
            {property.reviews > 0 && (
              <span className="text-xs text-muted-foreground">({property.reviews})</span>
            )}
          </span>
        </div>

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {property.area}, {property.city}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {property.roomType}
          </span>

          {property.amenities.slice(0, 3).map((a) => (
            <span
              key={a}
              className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {a}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <p className="text-lg font-bold">
              {formatINR(property.rent)}
              <span className="text-sm font-medium text-muted-foreground">/month</span>
            </p>

            <p className="text-[11px] text-muted-foreground">
              {showDeposit ? `Deposit ${formatINR(property.deposit)}` : property.distance}
            </p>
          </div>

          <Link
            to="/property/$id"
            params={{ id: property.id }}
            className="rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
