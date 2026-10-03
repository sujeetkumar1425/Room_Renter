import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AMENITY_LIST, ROOM_TYPES } from "@/lib/data";
import { PropertyMap } from "@/components/PropertyMap";

type FormState = {
  title: string;
  description: string;
  rent: string;
  deposit: string;
  city: string;
  address: string;
  locality: string;
  roomType: string;
  bedrooms: string;
  bathrooms: string;
  furnished: string;
  gender: string;
  available: boolean;
  latitude: string;
  longitude: string;
  amenities: string[];
};

export const Route = createFileRoute("/edit-property")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw redirect({ to: "/login" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role !== "landlord") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: EditPropertyPage,
});

function EditPropertyPage() {
  const search = Route.useSearch();
  const propertyId = String(search.id ?? "");
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!propertyId) {
        toast.error("Property ID is missing.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in as a landlord.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("properties")
        .select(
          "id,title,description,rent,deposit,city,address,locality,room_type,bedrooms,bathrooms,furnished,gender,available,latitude,longitude,amenities",
        )
        .eq("id", Number(propertyId))
        .eq("landlord_id", user.id)
        .single();

      if (error || !data) {
        console.error("Load property for edit:", error);
        toast.error(error?.message || "Property not found.");
        setLoading(false);
        return;
      }

      setForm({
        title: String(data.title ?? ""),
        description: String(data.description ?? ""),
        rent: String(data.rent ?? ""),
        deposit: String(data.deposit ?? ""),
        city: String(data.city ?? ""),
        address: String(data.address ?? ""),
        locality: String(data.locality ?? ""),
        roomType: String(data.room_type ?? "Single Room"),
        bedrooms: String(data.bedrooms ?? 1),
        bathrooms: String(data.bathrooms ?? 1),
        furnished:
          typeof data.furnished === "boolean"
            ? data.furnished
              ? "Fully Furnished"
              : "Unfurnished"
            : String(data.furnished ?? "Unfurnished"),
        gender: String(data.gender ?? "Any"),
        available: Boolean(data.available),
        latitude: data.latitude == null ? "" : String(data.latitude),
        longitude: data.longitude == null ? "" : String(data.longitude),
        amenities: Array.isArray(data.amenities)
          ? data.amenities.filter((item): item is string => typeof item === "string")
          : [],
      });

      setLoading(false);
    };

    void load();
  }, [propertyId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async () => {
    if (!form || saving) return;

    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    if (!form.rent || Number(form.rent) <= 0) {
      toast.error("Enter a valid monthly rent.");
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      toast.error("Enter valid latitude and longitude.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Your session has expired. Please log in again.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("properties")
      .update({
        title: form.title.trim(),
        description: form.description.trim(),
        rent: Number(form.rent),
        deposit: Number(form.deposit) || 0,
        city: form.city.trim(),
        address: form.address.trim(),
        locality: form.locality.trim(),
        room_type: form.roomType,
        bedrooms: Number(form.bedrooms) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        furnished: form.furnished,
        gender: form.gender,
        available: form.available,
        latitude,
        longitude,
        amenities: form.amenities,
      })
      .eq("id", Number(propertyId))
      .eq("landlord_id", user.id);

    if (error) {
      console.error("Update property error:", error);
      toast.error(error.message || "Could not save property.");
      setSaving(false);
      return;
    }

    toast.success("Property updated successfully.");
    setSaving(false);
  };

  if (loading) {
    return (
      <Page>
        <div className="container-page py-16 text-center text-sm text-muted-foreground">
          Loading property...
        </div>
      </Page>
    );
  }

  if (!form) {
    return (
      <Page>
        <div className="container-page py-16 text-center">
          <p className="text-muted-foreground">The property could not be loaded.</p>
          <Button asChild className="mt-5 rounded-xl">
            <Link to="/landlord">Back to dashboard</Link>
          </Button>
        </div>
      </Page>
    );
  }

  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  return (
    <Page>
      <div className="container-page max-w-5xl overflow-x-hidden pb-28 pt-6 sm:py-12">
        <Button
          asChild
          variant="ghost"
          className="mb-4 w-full justify-start rounded-xl sm:mb-5 sm:w-auto"
        >
          <Link to="/landlord">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to landlord dashboard
          </Link>
        </Button>

        <div>
          <p className="text-sm font-medium text-primary">Landlord</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Edit Property</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Update your listing details. Changes are saved directly to Supabase.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-lg font-bold">Property details</h2>

            <div className="mt-5 space-y-4">
              <Field label="Title">
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
              </Field>

              <Field label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="min-h-28"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monthly rent">
                  <Input
                    type="number"
                    min="0"
                    value={form.rent}
                    onChange={(e) => update("rent", e.target.value)}
                  />
                </Field>
                <Field label="Security deposit">
                  <Input
                    type="number"
                    min="0"
                    value={form.deposit}
                    onChange={(e) => update("deposit", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City">
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
                </Field>
                <Field label="Locality">
                  <Input
                    value={form.locality}
                    onChange={(e) => update("locality", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Address">
                <Textarea
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className="min-h-20"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Room type">
                  <select
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={form.roomType}
                    onChange={(e) => update("roomType", e.target.value)}
                  >
                    {ROOM_TYPES.map((roomType) => (
                      <option key={roomType} value={roomType}>
                        {roomType}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Furnishing">
                  <select
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={form.furnished}
                    onChange={(e) => update("furnished", e.target.value)}
                  >
                    <option>Fully Furnished</option>
                    <option>Semi Furnished</option>
                    <option>Unfurnished</option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Occupancy / bedrooms">
                  <Input
                    type="number"
                    min="1"
                    value={form.bedrooms}
                    onChange={(e) => update("bedrooms", e.target.value)}
                  />
                </Field>
                <Field label="Bathrooms">
                  <Input
                    type="number"
                    min="1"
                    value={form.bathrooms}
                    onChange={(e) => update("bathrooms", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Preferred gender">
                <select
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                >
                  <option>Any</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Checkbox
                  checked={form.available}
                  onCheckedChange={(checked) => update("available", checked === true)}
                />
                <span>
                  <span className="block text-sm font-medium">Available for renters</span>
                  <span className="block text-xs text-muted-foreground">
                    Turn this off to hide the listing from available-room searches.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-lg font-bold">Amenities & location</h2>

            <div className="mt-5">
              <p className="text-sm font-medium">Amenities</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {AMENITY_LIST.map((amenity) => {
                  const checked = form.amenities.includes(amenity);
                  return (
                    <label
                      key={amenity}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm leading-5"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          update(
                            "amenities",
                            value === true
                              ? [...form.amenities, amenity]
                              : form.amenities.filter((item) => item !== amenity),
                          );
                        }}
                      />
                      {amenity}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2">
              <Field label="Latitude">
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => update("latitude", e.target.value)}
                />
              </Field>
              <Field label="Longitude">
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => update("longitude", e.target.value)}
                />
              </Field>
            </div>

            {hasCoordinates ? (
              <div className="mt-4">
                <PropertyMap
                  latitude={latitude}
                  longitude={longitude}
                  title={form.title || "Property location"}
                  height="280px"
                />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-sm leading-6 text-muted-foreground sm:p-6">
                Enter valid coordinates to preview the map.
              </div>
            )}

            <Button
              className="mt-6 w-full rounded-xl"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </section>
        </div>
      </div>
    </Page>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
