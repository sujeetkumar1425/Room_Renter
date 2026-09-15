import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, CalendarDays, Wallet, Home as HomeIcon, SlidersHorizontal, Crosshair } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ROOM_TYPES } from "@/lib/data";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

const AMENITIES = [
  "Wi-Fi",
  "AC",
  "Kitchen",
  "Parking",
  "Attached Bathroom",
  "Furnished",
  "Power Backup",
  "Lift",
  "Security",
];

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/70 px-5 py-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function FiltersPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { city, setCity, openLocationModal } = useApp();
  const [date, setDate] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [type, setType] = useState("Any type");
  const [amenities, setAmenities] = useState<string[]>([]);

  const toggle = (a: string) =>
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const clearAll = () => {
    setDate("");
    setMin("");
    setMax("");
    setType("Any type");
    setAmenities([]);
  };

  const apply = () => {
    onOpenChange(false);
    navigate({ to: "/search", search: { city: city ?? "Lucknow", type, budget: max ? `Under ₹${max}` : undefined } });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </SheetTitle>
        </SheetHeader>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto">
          <Section icon={MapPin} title="Location">
            <button
              onClick={openLocationModal}
              className="flex w-full items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-muted"
            >
              <span className={cn(!city && "text-muted-foreground")}>{city ?? "Select your city"}</span>
              <Crosshair className="h-4 w-4 text-muted-foreground" />
            </button>
          </Section>

          <Section icon={CalendarDays} title="Move-in Date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl"
            />
          </Section>

          <Section icon={Wallet} title="Budget (per month)">
            <div className="flex items-center gap-3">
              <Input
                inputMode="numeric"
                placeholder="Min"
                value={min}
                onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
                className="rounded-xl"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                inputMode="numeric"
                placeholder="Max"
                value={max}
                onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
                className="rounded-xl"
              />
            </div>
          </Section>

          <Section icon={HomeIcon} title="Room Type">
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    type === t
                      ? "bg-accent text-primary ring-1 ring-primary/40"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "Any type" ? "Any" : t}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={SlidersHorizontal} title="Amenities">
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <label
                  key={a}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm"
                >
                  <Checkbox checked={amenities.includes(a)} onCheckedChange={() => toggle(a)} />
                  {a}
                </label>
              ))}
            </div>
          </Section>
        </div>

        <div className="flex items-center gap-3 border-t border-border p-4">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={clearAll}>
            Clear All
          </Button>
          <Button className="flex-[2] rounded-xl" onClick={apply}>
            Show Rooms
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
