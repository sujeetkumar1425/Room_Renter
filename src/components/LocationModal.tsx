import { useState } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CITIES } from "@/lib/data";
import { useApp } from "@/lib/app-context";

export function LocationModal() {
  const { showLocationModal, closeLocationModal, setCity, setStatus } = useApp();
  const [mode, setMode] = useState<"ask" | "manual">("ask");
  const [detecting, setDetecting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState("");

  const detect = () => {
    setDetecting(true);
    setDenied(false);
    const finish = (cityName: string) => {
      setCity(cityName, "granted");
      setDetecting(false);
      closeLocationModal();
    };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setDetecting(false);
      setDenied(true);
      setMode("manual");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => finish("Lucknow"),
      () => {
        setDetecting(false);
        setStatus("denied");
        setDenied(true);
        setMode("manual");
      },
      { timeout: 8000 },
    );
  };

  const results = CITIES.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Dialog open={showLocationModal} onOpenChange={(o) => !o && closeLocationModal()}>
      <DialogContent showCloseButton className="max-w-md rounded-3xl p-0 overflow-hidden">
        <div className="px-6 pt-8 pb-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent">
            <MapPin className="h-9 w-9 text-primary" strokeWidth={1.8} />
          </div>
          {mode === "ask" ? (
            <>
              <h2 className="mt-5 text-2xl font-bold">Find rooms near you</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Allow location access to discover rooms and properties available near your current
                location.
              </p>
              <div className="mt-6 space-y-3">
                <Button size="lg" className="w-full rounded-xl" onClick={detect} disabled={detecting}>
                  {detecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  {detecting ? "Detecting your city…" : "Allow Location"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => setMode("manual")}
                >
                  Enter Location Manually
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-5 text-2xl font-bold">Choose your city</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {denied
                  ? "We couldn't access your location. Pick your city to continue."
                  : "Select the city you are looking for a room in."}
              </p>
              <Input
                className="mt-5 h-11 rounded-xl"
                placeholder="Search city, e.g. Lucknow"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="mt-3 max-h-60 space-y-1 overflow-y-auto text-left">
                {results.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setCity(c.name, "manual");
                      closeLocationModal();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {c.name}
                      <span className="text-xs font-normal text-muted-foreground">{c.state}</span>
                    </span>
                    <span
                      className={
                        c.available
                          ? "rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success"
                          : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      }
                    >
                      {c.available ? "Available" : "Coming soon"}
                    </span>
                  </button>
                ))}
                {results.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No city found.</p>
                )}
              </div>
              <button
                onClick={() => setMode("ask")}
                className="mt-4 text-xs font-medium text-primary hover:underline"
              >
                Use my current location instead
              </button>
            </>
          )}
          <p className="mt-5 text-[11px] text-muted-foreground">
            Room Renter is currently live in Lucknow only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
