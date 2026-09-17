//import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  MapPin,
  BedDouble,
  Wifi,
  Images,
  ScrollText,
  Eye,
  Check,
  Upload,
  Trash2,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVE_CITY, ROOM_TYPES, AMENITY_LIST, formatINR } from "@/lib/data";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/list-property")({
  head: () => ({
    meta: [
      { title: "List your property — Room Renter" },
      {
        name: "description",
        content:
          "Owners: add your room, PG or flat in Lucknow to Room Renter in six quick steps and start receiving verified enquiries.",
      },
      { property: "og:title", content: "List your property — Room Renter" },
      {
        property: "og:description",
        content: "Add rooms, set rent and amenities, upload photos and publish your Lucknow listing.",
      },
    ],
  }),
  component: ListPropertyPage,
});

const steps = [
  { label: "Location", icon: MapPin },
  { label: "Room Details", icon: BedDouble },
  { label: "Amenities", icon: Wifi },
  { label: "Photos", icon: Images },
  { label: "Rules", icon: ScrollText },
  { label: "Preview", icon: Eye },
];

const amenities = AMENITY_LIST?.length
  ? AMENITY_LIST
  : ["Wi-Fi", "AC", "Parking", "Kitchen", "Attached Bathroom", "Washing Machine", "Power Backup", "Food"];

function ListPropertyPage() {
  const { role } = useApp();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "",
    address: "",
    locality: "",
    city: ACTIVE_CITY,
    propertyType: "Independent House",
    roomType: "Single Room",
    occupancy: "1",
    furnished: "Fully Furnished",
    rent: "",
    deposit: "",
    available: "",
    description: "",
    gender: "Any",
  });
  const [picked, setPicked] = useState<string[]>(["Wi-Fi", "Attached Bathroom"]);
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rules, setRules] = useState({
    guests: true,
    pets: false,
    smoking: false,
    noise: true,
    subletting: false,
    custom: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleAmenity = (a: string) =>
    setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  const addPhoto = () => {
    fileInputRef.current?.click();
  };
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (!files.length) return;

    const previews = files.map((file) => URL.createObjectURL(file));

    setPhotos((current) => [...current, ...previews]);

    e.target.value = "";
  };
  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const publish = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Please log in as a landlord first.");
        return;
      }

      if (!form.title.trim()) {
        toast.error("Please enter a listing title.");
        setStep(0);
        return;
      }

      if (!form.address.trim()) {
        toast.error("Please enter the full address.");
        setStep(0);
        return;
      }

      if (!form.rent) {
        toast.error("Please enter the monthly rent.");
        setStep(1);
        return;
      }

      const { data, error } = await supabase
        .from("properties")
        .insert({
          landlord_id: session.user.id,
          title: form.title,
          description: form.description,
          rent: Number(form.rent),
          city: form.city,
          address: form.address,
          room_type: form.roomType,
          bedrooms: Number(form.occupancy),
          bathrooms: 1,
          available: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Property insert error:", error);
        toast.error(error.message);
        return;
      }

      console.log("Property created:", data);

      toast.success("Property published successfully!");
      setStep(0);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Something went wrong while publishing.");
    }
  };

  return (
    <Page>
      <div className="container-page py-8 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">List your property</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Owners can add rooms in {ACTIVE_CITY} — other cities open soon.
            </p>
          </div>
          {role !== "owner" && (
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/login">Log in as owner</Link>
            </Button>
          )}
        </div>

        {/* STEPPER */}
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
          {steps.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setStep(i)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                i === step
                  ? "border-primary bg-accent text-primary"
                  : i < step
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              {s.label}
            </button>
          ))}
        </div>

        <div className="card-surface mt-6 p-5 sm:p-7">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Listing title" className="sm:col-span-2">
                <Input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Fully Furnished Room in Gomti Nagar"
                  className="rounded-xl"
                />
              </Field>
              <Field label="Full address" className="sm:col-span-2">
                <Textarea
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="House 21, Vipul Khand 2, Gomti Nagar"
                  className="rounded-xl"
                />
              </Field>
              <Field label="Locality">
                <Input
                  value={form.locality}
                  onChange={(e) => set("locality", e.target.value)}
                  placeholder="Gomti Nagar"
                  className="rounded-xl"
                />
              </Field>
              <Field label="City">
                <Select value={form.city} onValueChange={(v) => set("city", v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ACTIVE_CITY}>{ACTIVE_CITY} (available)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Listings are accepted only in currently supported cities.
                </p>
              </Field>
              <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground sm:col-span-2">
                <MapPin className="mr-2 h-4 w-4 text-primary" /> Drop the pin on your exact location
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Property type">
                <Select value={form.propertyType} onValueChange={(v) => set("propertyType", v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Independent House", "Apartment", "PG Hostel", "Builder Floor"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Room type">
                <Select value={form.roomType} onValueChange={(v) => set("roomType", v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.filter((t) => t !== "Any type").map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Occupancy (persons)">
                <Input
                  inputMode="numeric"
                  value={form.occupancy}
                  onChange={(e) => set("occupancy", e.target.value.replace(/\D/g, ""))}
                  className="rounded-xl"
                />
              </Field>
              <Field label="Furnishing">
                <Select value={form.furnished} onValueChange={(v) => set("furnished", v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Fully Furnished", "Semi Furnished", "Unfurnished"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Monthly rent (₹)">
                <Input
                  inputMode="numeric"
                  value={form.rent}
                  onChange={(e) => set("rent", e.target.value.replace(/\D/g, ""))}
                  placeholder="10000"
                  className="rounded-xl"
                />
              </Field>
              <Field label="Security deposit (₹)">
                <Input
                  inputMode="numeric"
                  value={form.deposit}
                  onChange={(e) => set("deposit", e.target.value.replace(/\D/g, ""))}
                  placeholder="20000"
                  className="rounded-xl"
                />
              </Field>
              <Field label="Available from">
                <Input
                  type="date"
                  value={form.available}
                  onChange={(e) => set("available", e.target.value)}
                  className="rounded-xl"
                />
              </Field>
              <Field label="Gender preference">
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Any", "Boys only", "Girls only", "Family"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Bright room with balcony, 10 min from Lulu Mall…"
                  className="min-h-28 rounded-xl"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => {
                const name = typeof a === "string" ? a : (a as { label: string }).label;
                return (
                  <label
                    key={name}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox checked={picked.includes(name)} onCheckedChange={() => toggleAmenity(name)} />
                    {name}
                  </label>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div>
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoChange}
                />

                <button
                  type="button"
                  onClick={addPhoto}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 py-10 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Upload className="h-5 w-5 text-primary" />
                  Upload room photos — first photo becomes the cover
                </button>
              </>
              {photos.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {photos.map((p, i) => (
                    <div key={p} className="card-surface flex items-center justify-between gap-2 p-3 text-sm">
                      <span className="truncate">
                        {p}
                        {i === 0 && <span className="ml-2 text-xs font-semibold text-primary">Cover</span>}
                      </span>
                      <button onClick={() => removePhoto(i)} aria-label={`Remove ${p}`}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              {[
                ["guests", "Guests allowed"],
                ["pets", "Pets allowed"],
                ["smoking", "Smoking allowed"],
                ["noise", "Quiet hours after 10 PM"],
                ["subletting", "Subletting allowed"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <Label className="font-medium">{label}</Label>
                  <Switch
                    checked={rules[key as keyof typeof rules] as boolean}
                    onCheckedChange={(v) => setRules((r) => ({ ...r, [key]: v }))}
                  />
                </div>
              ))}
              <Field label="Custom house rules">
                <Textarea
                  value={rules.custom}
                  onChange={(e) => setRules((r) => ({ ...r, custom: e.target.value }))}
                  placeholder="Main gate closes at 11 PM."
                  className="rounded-xl"
                />
              </Field>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Building2 className="h-4 w-4" /> Listing preview
              </div>
              <h2 className="mt-2 text-2xl font-bold">{form.title || "Untitled room"}</h2>
              <p className="text-sm text-muted-foreground">
                {[form.locality, form.city].filter(Boolean).join(", ")}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Rent" value={form.rent ? `${formatINR(Number(form.rent))}/mo` : "—"} />
                <Stat label="Deposit" value={form.deposit ? formatINR(Number(form.deposit)) : "—"} />
                <Stat label="Available" value={form.available || "Immediately"} />
                <Stat label="Room type" value={form.roomType} />
                <Stat label="Furnishing" value={form.furnished} />
                <Stat label="Gender" value={form.gender} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {form.description || "No description added yet."}
              </p>
              <p className="mt-4 text-sm">
                <span className="font-semibold">Amenities: </span>
                {picked.join(" · ") || "None selected"}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-semibold">Photos: </span>
                {photos.length} uploaded
              </p>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button className="rounded-xl" onClick={() => setStep((s) => s + 1)}>
                Continue
              </Button>
            ) : (
              <Button className="rounded-xl" onClick={publish}>
                <Check className="h-4 w-4" /> Publish Property
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}
