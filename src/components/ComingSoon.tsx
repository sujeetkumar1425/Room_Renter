import { Link } from "@tanstack/react-router";
import { Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";

export function ComingSoon({ city }: { city?: string | null }) {
  const { setCity } = useApp();
  return (
    <div className="card-surface mx-auto max-w-xl px-6 py-12 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent">
        <Clock className="h-9 w-9 text-primary" strokeWidth={1.7} />
      </div>
      <h2 className="mt-5 text-2xl font-bold sm:text-3xl">
        Room Renter is coming soon to your city.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Currently, Room Renter is available only in Lucknow. We&apos;re working to bring rooms to
        {city ? ` ${city}` : " your city"} soon.
      </p>
      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="rounded-xl" onClick={() => setCity("Lucknow")}>
          <Link to="/search" search={{ city: "Lucknow" }}>
            <MapPin className="h-4 w-4" /> Explore Lucknow
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-xl">
          <Link to="/">Notify me when we launch</Link>
        </Button>
      </div>
    </div>
  );
}
