import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";

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
  Search,
  Loader2,
} from "lucide-react";

import "leaflet/dist/leaflet.css";

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
import { LandlordVerificationCard } from "@/components/LandlordVerificationCard";

export const Route = createFileRoute("/list-property")({
  head: () => ({
    meta: [
      { title: "List your property — Room Renter" },
      {
        name: "description",
        content:
          "Owners: add your room, PG or flat in Lucknow to Room Renter in six quick steps and start receiving verified enquiries.",
      },
      {
        property: "og:title",
        content: "List your property — Room Renter",
      },
      {
        property: "og:description",
        content:
          "Add rooms, set rent and amenities, upload photos and publish your Lucknow listing.",
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
  : [
      "Wi-Fi",
      "AC",
      "Parking",
      "Kitchen",
      "Attached Bathroom",
      "Washing Machine",
      "Power Backup",
      "Food",
    ];

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

  type SelectedPhoto = {
    file: File;
    preview: string;
  };

  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rules, setRules] = useState({
    guests: true,
    pets: false,
    smoking: false,
    noise: true,
    subletting: false,
    custom: "",
  });

  /*
   * ============================================================
   * LOCATION STATE
   * ============================================================
   */

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [locationSearch, setLocationSearch] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));

  const toggleAmenity = (a: string) =>
    setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  /*
   * ============================================================
   * PHOTO FUNCTIONS
   * ============================================================
   */

  const addPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (!files.length) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length !== files.length) {
      toast.error("Only image files can be uploaded.");
    }

    const remainingSlots = Math.max(0, 6 - photos.length);

    const filesToAdd = imageFiles.slice(0, remainingSlots);

    if (imageFiles.length > remainingSlots) {
      toast.error("You can upload a maximum of 6 photos.");
    }

    const selectedPhotos = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos((current) => [...current, ...selectedPhotos]);

    e.target.value = "";
  };

  const removePhoto = (i: number) => {
    setPhotos((current) => {
      const photo = current[i];

      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }

      return current.filter((_, idx) => idx !== i);
    });
  };

  /*
   * ============================================================
   * LOCATION SEARCH
   * ============================================================
   *
   * OpenStreetMap Nominatim is used here.
   * No Google Maps API key is required.
   */

  const searchLocation = async () => {
    const query = locationSearch.trim();

    if (!query) {
      toast.error("Enter a location to search.");
      return;
    }

    setLocationLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
          query,
        )}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Location search failed.");
      }

      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (!results.length) {
        toast.error("Location not found. Try a more specific address.");
        return;
      }

      const result = results[0];

      const lat = Number(result.lat);
      const lng = Number(result.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Invalid location coordinates.");
      }

      setLatitude(lat);
      setLongitude(lng);

      set("address", result.display_name);

      toast.success("Location found. You can drag the pin to adjust it.");
    } catch (error) {
      console.error("Location search error:", error);

      toast.error(error instanceof Error ? error.message : "Could not search for this location.");
    } finally {
      setLocationLoading(false);
    }
  };

  /*
   * ============================================================
   * PUBLISH
   * ============================================================
   */

  const publish = async () => {
    if (isPublishing) return;

    setIsPublishing(true);

    console.log("🔥 PUBLISH FUNCTION STARTED");

    let createdPropertyId: number | string | null = null;

    const uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Auth error:", userError);
        toast.error(userError.message);
        return;
      }

      if (!user) {
        toast.error("Please log in as a landlord first.");
        return;
      }

      // Load the real landlord details before creating the listing.
      const { data: landlordProfile, error: landlordProfileError } = await supabase
        .from("profiles")
        .select("full_name, phone, permanent_address, aadhaar_last4, aadhaar_verified")
        .eq("id", user.id)
        .maybeSingle();

      if (landlordProfileError) {
        toast.error("Could not load your landlord verification details.");
        return;
      }

      // Supabase may return phone/aadhaar_last4 as BIGINT.
      // Convert them to strings before validation.
      const phone = String(landlordProfile?.phone ?? "").trim();
      const permanentAddress = String(landlordProfile?.permanent_address ?? "").trim();
      const aadhaarLast4 = String(landlordProfile?.aadhaar_last4 ?? "").trim();
      const landlordName =
        landlordProfile?.full_name?.trim() ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Property Owner";

      if (
        !landlordName ||
        !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, "")) ||
        permanentAddress.length < 10 ||
        !/^\d{4}$/.test(aadhaarLast4)
      ) {
        toast.error(
          "Complete the landlord identity details at the top of this page before publishing.",
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
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

      if (latitude === null || longitude === null) {
        toast.error("Please select the exact property location on the map.");
        setStep(0);
        return;
      }

      if (!form.rent) {
        toast.error("Please enter the monthly rent.");
        setStep(1);
        return;
      }

      /*
       * IMPORTANT:
       *
       * properties.id is BIGINT/identity.
       * We do not generate a UUID.
       */

      console.log("1️⃣ Creating property record...");

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          landlord_id: user.id,
          landlord_name: landlordName,
          landlord_phone: phone.replace(/\D/g, ""),
          landlord_identity_verified: Boolean(landlordProfile?.aadhaar_verified),
          title: form.title.trim(),
          description: form.description.trim(),
          rent: Number(form.rent),
          deposit: form.deposit ? Number(form.deposit) : 0,

          city: form.city,

          address: form.address.trim(),
          locality: form.locality.trim(),

          room_type: form.roomType,

          bedrooms: Number(form.occupancy) || 1,

          bathrooms: 1,

          available: true,

          furnished: form.furnished !== "Unfurnished",

          gender: form.gender,

          amenities: picked,

          images: [],

          /*
           * LOCATION
           */
          latitude,
          longitude,
        })
        .select("id")
        .single();

      if (propertyError || !property) {
        console.error("Property creation error:", propertyError);

        toast.error(propertyError?.message || "Could not create the property.");

        return;
      }

      createdPropertyId = property.id;

      console.log("2️⃣ Property created with database id:", createdPropertyId);

      const imageUrls: string[] = [];

      /*
       * ========================================================
       * UPLOAD IMAGES
       * ========================================================
       */

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        const extension = photo.file.name.split(".").pop()?.toLowerCase() || "jpg";

        const filePath = `${user.id}/${createdPropertyId}/${i + 1}.${extension}`;

        console.log(`3️⃣ Uploading image ${i + 1}/${photos.length}:`, filePath);

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(filePath, photo.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: photo.file.type || "image/jpeg",
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError);

          throw new Error(`Could not upload photo ${i + 1}: ${uploadError.message}`);
        }

        uploadedPaths.push(filePath);

        const { data: publicData } = supabase.storage
          .from("property-images")
          .getPublicUrl(filePath);

        imageUrls.push(publicData.publicUrl);
      }

      console.log("4️⃣ Images uploaded:", imageUrls);

      /*
       * ========================================================
       * SAVE IMAGE URLS
       * ========================================================
       */

      const { error: imageUpdateError } = await supabase
        .from("properties")
        .update({
          images: imageUrls,
        })
        .eq("id", createdPropertyId);

      if (imageUpdateError) {
        console.error("Image URL update error:", imageUpdateError);

        throw new Error(
          `Property was created, but images could not be saved: ${imageUpdateError.message}`,
        );
      }

      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));

      setPhotos([]);

      toast.success("Property published successfully!");

      setStep(0);

      console.log("🎉 PROPERTY PUBLISHED SUCCESSFULLY:", createdPropertyId);
    } catch (error) {
      console.error("Unexpected publish error:", error);

      /*
       * Clean up uploaded files.
       */

      if (uploadedPaths.length > 0) {
        await supabase.storage.from("property-images").remove(uploadedPaths);
      }

      /*
       * Clean up database row.
       */

      if (createdPropertyId !== null) {
        await supabase.from("properties").delete().eq("id", createdPropertyId);
      }

      toast.error(
        error instanceof Error ? error.message : "Something went wrong while publishing.",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <Page>
      <div className="container-page py-8 sm:py-12">
        <LandlordVerificationCard />

        {/* HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">List your property</h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Owners can add rooms in {ACTIVE_CITY} — other cities open soon.
            </p>
          </div>

          {role !== "landlord" && (
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/login">Log in as landlord</Link>
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

        {/* MAIN CARD */}

        <div className="card-surface mt-6 p-5 sm:p-7">
          {/* ==================================================
              STEP 0 — LOCATION
              ================================================== */}

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

              {/* LOCATION SEARCH */}

              <div className="sm:col-span-2">
                <Field label="Search exact location">
                  <div className="flex gap-2">
                    <Input
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          searchLocation();
                        }
                      }}
                      placeholder="Search address, locality or landmark"
                      className="rounded-xl"
                    />

                    <Button
                      type="button"
                      onClick={searchLocation}
                      disabled={locationLoading}
                      className="shrink-0 rounded-xl"
                    >
                      {locationLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}

                      <span className="hidden sm:inline">Search</span>
                    </Button>
                  </div>

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Search for your property, then click the map or drag the marker to the exact
                    location.
                  </p>
                </Field>
              </div>

              {/* MAP */}

              <div className="sm:col-span-2">
                <PropertyLocationMap
                  latitude={latitude}
                  longitude={longitude}
                  onLocationChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
              </div>

              {/* COORDINATES */}

              <div className="sm:col-span-2">
                {latitude !== null && longitude !== null ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-primary">
                      <MapPin className="h-4 w-4" />
                      Exact location selected
                    </div>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Your property location has been selected on the map. Click another point or
                      drag the pin to adjust it.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Select exact property location
                    </div>

                    <p className="mt-1 text-xs leading-5">
                      Search for your property or click anywhere on the map to place the pin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              STEP 1 — ROOM DETAILS
              ================================================== */}

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

          {/* ==================================================
              STEP 2 — AMENITIES
              ================================================== */}

          {step === 2 && (
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => {
                const name =
                  typeof a === "string"
                    ? a
                    : (
                        a as {
                          label: string;
                        }
                      ).label;

                return (
                  <label
                    key={name}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={picked.includes(name)}
                      onCheckedChange={() => toggleAmenity(name)}
                    />

                    {name}
                  </label>
                );
              })}
            </div>
          )}

          {/* ==================================================
              STEP 3 — PHOTOS
              ================================================== */}

          {step === 3 && (
            <div>
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

              {photos.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {photos.map((photo, i) => (
                    <div key={photo.preview} className="card-surface overflow-hidden p-3 text-sm">
                      <div className="relative">
                        <img
                          src={photo.preview}
                          alt={`Property photo ${i + 1}`}
                          className="h-40 w-full rounded-xl object-cover"
                        />

                        {i === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                            Cover
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={`Remove photo ${i + 1}`}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>

                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        {photo.file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              STEP 4 — RULES
              ================================================== */}

          {step === 4 && (
            <div className="space-y-3">
              {[
                ["guests", "Guests allowed"],
                ["pets", "Pets allowed"],
                ["smoking", "Smoking allowed"],
                ["noise", "Quiet hours after 10 PM"],
                ["subletting", "Subletting allowed"],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <Label className="font-medium">{label}</Label>

                  <Switch
                    checked={rules[key as keyof typeof rules] as boolean}
                    onCheckedChange={(v) =>
                      setRules((r) => ({
                        ...r,
                        [key]: v,
                      }))
                    }
                  />
                </div>
              ))}

              <Field label="Custom house rules">
                <Textarea
                  value={rules.custom}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      custom: e.target.value,
                    }))
                  }
                  placeholder="Main gate closes at 11 PM."
                  className="rounded-xl"
                />
              </Field>
            </div>
          )}

          {/* ==================================================
              STEP 5 — PREVIEW
              ================================================== */}

          {step === 5 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Building2 className="h-4 w-4" />
                Listing preview
              </div>

              <h2 className="mt-2 text-2xl font-bold">{form.title || "Untitled room"}</h2>

              <p className="text-sm text-muted-foreground">
                {[form.locality, form.city].filter(Boolean).join(", ")}
              </p>

              {latitude !== null && longitude !== null && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Exact location selected
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Rent" value={form.rent ? `${formatINR(Number(form.rent))}/mo` : "—"} />

                <Stat
                  label="Deposit"
                  value={form.deposit ? formatINR(Number(form.deposit)) : "—"}
                />

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

          {/* ==================================================
              NAVIGATION
              ================================================== */}

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
              <Button
                type="button"
                className="rounded-xl"
                disabled={isPublishing}
                onClick={() => {
                  console.log("🔥 PUBLISH BUTTON CLICKED");

                  publish();
                }}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Publish Property
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

/*
 * ==============================================================
 * PROPERTY LOCATION MAP
 * ==============================================================
 *
 * IMPORTANT:
 *
 * Leaflet is NOT imported at the top of the file.
 *
 * It is dynamically imported inside useEffect().
 *
 * This prevents TanStack Start/Vite SSR from trying to execute
 * Leaflet in Node where window/document do not exist.
 */

function PropertyLocationMap({
  latitude,
  longitude,
  onLocationChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (latitude: number, longitude: number) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);

  const markerRef = useRef<Marker | null>(null);

  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const initializedRef = useRef(false);

  /*
   * Default center = Lucknow
   */

  const DEFAULT_LATITUDE = 26.8467;
  const DEFAULT_LONGITUDE = 80.9462;

  /*
   * Initialize Leaflet ONLY in browser.
   */

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      if (!mapContainerRef.current || initializedRef.current) {
        return;
      }

      /*
       * IMPORTANT:
       *
       * Leaflet is dynamically imported here.
       *
       * It will never be evaluated during SSR.
       */

      const leafletModule = await import("leaflet");

      if (cancelled) return;

      const L = leafletModule.default;

      leafletRef.current = L;

      if (!mapContainerRef.current) {
        return;
      }

      initializedRef.current = true;

      const initialLatitude = latitude ?? DEFAULT_LATITUDE;

      const initialLongitude = longitude ?? DEFAULT_LONGITUDE;

      /*
       * Create map
       */

      const map = L.map(mapContainerRef.current).setView(
        [initialLatitude, initialLongitude],
        latitude !== null && longitude !== null ? 17 : 12,
      );

      mapRef.current = map;

      /*
       * OpenStreetMap tiles
       */

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

        maxZoom: 19,
      }).addTo(map);

      /*
       * Custom marker.
       *
       * We use divIcon instead of Leaflet's default image
       * assets, so Vite does not have to process marker PNGs.
       */

      const markerIcon = L.divIcon({
        className: "room-renter-map-marker",

        html: `
            <div
              style="
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                background: #2563eb;
                border: 3px solid white;
                box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              "
            >
              <div
                style="
                  width: 10px;
                  height: 10px;
                  border-radius: 50%;
                  background: white;
                "
              ></div>
            </div>
          `,

        iconSize: [36, 36],

        iconAnchor: [18, 36],

        popupAnchor: [0, -36],
      });

      /*
       * Add marker helper
       */

      const createMarker = (lat: number, lng: number) => {
        if (!mapRef.current) {
          return;
        }

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);

          return;
        }

        const marker = L.marker([lat, lng], {
          icon: markerIcon,
          draggable: true,
        }).addTo(mapRef.current);

        markerRef.current = marker;

        /*
         * Marker drag
         */

        marker.on("dragend", () => {
          const position = marker.getLatLng();

          onLocationChange(position.lat, position.lng);
        });
      };

      /*
       * Existing selected location
       */

      if (latitude !== null && longitude !== null) {
        createMarker(latitude, longitude);
      }

      /*
       * Map click
       */

      map.on("click", (event: LeafletMouseEvent) => {
        const lat = event.latlng.lat;

        const lng = event.latlng.lng;

        createMarker(lat, lng);

        onLocationChange(lat, lng);
      });

      /*
       * Fix map sizing after rendering.
       */

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    };

    initializeMap();

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      markerRef.current = null;
      leafletRef.current = null;
      initializedRef.current = false;
    };

    /*
     * We intentionally initialize the map only once.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Update marker/map when location is searched.
   */

  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || latitude === null || longitude === null) {
      return;
    }

    const map = mapRef.current;

    const L = leafletRef.current;

    /*
     * If marker already exists,
     * move it.
     */

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      /*
       * Create marker if it doesn't exist.
       */

      const markerIcon = L.divIcon({
        className: "room-renter-map-marker",

        html: `
            <div
              style="
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                background: #2563eb;
                border: 3px solid white;
                box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              "
            >
              <div
                style="
                  width: 10px;
                  height: 10px;
                  border-radius: 50%;
                  background: white;
                "
              ></div>
            </div>
          `,

        iconSize: [36, 36],

        iconAnchor: [18, 36],

        popupAnchor: [0, -36],
      });

      const marker = L.marker([latitude, longitude], {
        icon: markerIcon,
        draggable: true,
      }).addTo(map);

      markerRef.current = marker;

      marker.on("dragend", () => {
        const position = marker.getLatLng();

        onLocationChange(position.lat, position.lng);
      });
    }

    /*
     * Center map on selected location.
     */

    map.setView([latitude, longitude], 17, {
      animate: true,
    });
  }, [latitude, longitude, onLocationChange]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div ref={mapContainerRef} className="h-[380px] w-full" />

      <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        Click on the map to place the pin, or drag the existing pin to the exact property location.
      </div>
    </div>
  );
}

/*
 * ==============================================================
 * FIELD
 * ==============================================================
 */

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

/*
 * ==============================================================
 * STAT
 * ==============================================================
 */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}
