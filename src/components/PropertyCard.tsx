import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Star, BadgeCheck } from "lucide-react";
import type { Property } from "@/lib/data";
import { formatINR } from "@/lib/data";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export function PropertyCard({
  property,
  compact = false,
  showDeposit = false,
}: {
  property: Property;
  compact?: boolean;
  showDeposit?: boolean;
}) {
  const { isSaved, toggleSaved } = useApp();
  const saved = isSaved(property.id);

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
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}
        <button
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
            {property.rating}
            <span className="text-xs text-muted-foreground">({property.reviews})</span>
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
