import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import { ArrowLeft, ImagePlus, Loader2, MapPin, Search, Save, Trash2, Upload } from "lucide-react";

import "leaflet/dist/leaflet.css";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { AMENITY_LIST, ROOM_TYPES } from "@/lib/data";

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

type NewPhoto = {
  file: File;
  preview: string;
};

export const Route = createFileRoute("/edit-property")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),

  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

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

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
          "id,title,description,rent,deposit,city,address,locality,room_type,bedrooms,bathrooms,furnished,gender,available,latitude,longitude,amenities,images",
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

      setExistingImages(
        Array.isArray(data.images)
          ? data.images.filter((image): image is string => typeof image === "string")
          : [],
      );

      setLoading(false);
    };

    void load();
  }, [propertyId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  /*
   * ============================================================
   * IMAGE FUNCTIONS
   * ============================================================
   */

  const openImagePicker = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length !== files.length) {
      toast.error("Only image files can be uploaded.");
    }

    const totalImages = existingImages.length + newPhotos.length;

    const remainingSlots = Math.max(0, 6 - totalImages);

    if (remainingSlots === 0) {
      toast.error("You can have a maximum of 6 photos.");
      event.target.value = "";
      return;
    }

    const filesToAdd = imageFiles.slice(0, remainingSlots);

    if (imageFiles.length > remainingSlots) {
      toast.error("You can have a maximum of 6 photos.");
    }

    const photos: NewPhoto[] = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setNewPhotos((current) => [...current, ...photos]);

    event.target.value = "";
  };

  const removeExistingImage = (index: number) => {
    const image = existingImages[index];

    if (!image) {
      return;
    }

    setRemovedImages((current) => [...current, image]);

    setExistingImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  };

  const removeNewImage = (index: number) => {
    setNewPhotos((current) => {
      const photo = current[index];

      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }

      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  };

  /*
   * ============================================================
   * LOCATION
   * ============================================================
   */

  const [locationSearch, setLocationSearch] = useState("");

  const [locationLoading, setLocationLoading] = useState(false);

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

      const latitude = Number(result.lat);
      const longitude = Number(result.lon);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Invalid location coordinates.");
      }

      update("latitude", String(latitude));
      update("longitude", String(longitude));

      update("address", result.display_name);

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
   * SAVE
   * ============================================================
   */

  const save = async () => {
    if (!form || saving) {
      return;
    }

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
      toast.error("Please select the property location on the map.");
      return;
    }

    const totalImages = existingImages.length + newPhotos.length;

    if (totalImages > 6) {
      toast.error("A property can have a maximum of 6 photos.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Your session has expired. Please log in again.");
        return;
      }

      /*
       * --------------------------------------------------------
       * Upload NEW images
       * --------------------------------------------------------
       */

      const uploadedPaths: string[] = [];
      const uploadedUrls: string[] = [];

      for (const photo of newPhotos) {
        const extension = photo.file.name.split(".").pop()?.toLowerCase() || "jpg";

        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

        const filePath = `${user.id}/${propertyId}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(filePath, photo.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: photo.file.type || "image/jpeg",
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError);

          throw new Error(`Could not upload ${photo.file.name}: ${uploadError.message}`);
        }

        uploadedPaths.push(filePath);

        const { data: publicData } = supabase.storage
          .from("property-images")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicData.publicUrl);
      }

      /*
       * --------------------------------------------------------
       * Final image list
       * --------------------------------------------------------
       */

      const finalImages = [...existingImages, ...uploadedUrls];

      /*
       * --------------------------------------------------------
       * Update property
       * --------------------------------------------------------
       */

      const { error: updateError } = await supabase
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

          /*
           * Database column is boolean.
           */
          furnished: form.furnished === "Fully Furnished",

          gender: form.gender,

          available: form.available,

          latitude,

          longitude,

          amenities: form.amenities,

          images: finalImages,
        })
        .eq("id", Number(propertyId))
        .eq("landlord_id", user.id);

      if (updateError) {
        /*
         * If database update fails, remove the newly uploaded
         * files so we don't leave orphaned storage files.
         */
        if (uploadedPaths.length > 0) {
          await supabase.storage.from("property-images").remove(uploadedPaths);
        }

        throw new Error(updateError.message || "Could not save property.");
      }

      /*
       * --------------------------------------------------------
       * Delete removed old images from Storage
       * --------------------------------------------------------
       */

      if (removedImages.length > 0) {
        const pathsToDelete = removedImages
          .map((url) => getStoragePathFromPublicUrl(url))
          .filter((path): path is string => Boolean(path));

        if (pathsToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from("property-images")
            .remove(pathsToDelete);

          if (deleteError) {
            console.warn("Some removed images could not be deleted from storage:", deleteError);
          }
        }
      }

      /*
       * Clean up previews.
       */
      newPhotos.forEach((photo) => {
        URL.revokeObjectURL(photo.preview);
      });

      setNewPhotos([]);
      setRemovedImages([]);
      setExistingImages(finalImages);

      toast.success("Property updated successfully.");
    } catch (error) {
      console.error("Update property error:", error);

      toast.error(error instanceof Error ? error.message : "Could not save property.");
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

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

  const totalImages = existingImages.length + newPhotos.length;

  return (
    <Page>
      <div className="container-page max-w-6xl py-8 sm:py-12">
        <Button asChild variant="ghost" className="mb-5 rounded-xl">
          <Link to="/landlord">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to landlord dashboard
          </Link>
        </Button>

        <div>
          <p className="text-sm font-medium text-primary">Landlord</p>

          <h1 className="mt-1 text-3xl font-bold">Edit Property</h1>

          <p className="mt-2 text-muted-foreground">
            Update your property details, photos and exact location.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* ==================================================
              PROPERTY DETAILS
              ================================================== */}

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold">Property details</h2>

            <div className="mt-5 space-y-4">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  className="rounded-xl"
                />
              </Field>

              <Field label="Description">
                <Textarea
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  className="min-h-28 rounded-xl"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monthly rent">
                  <Input
                    type="number"
                    min="0"
                    value={form.rent}
                    onChange={(event) => update("rent", event.target.value)}
                    className="rounded-xl"
                  />
                </Field>

                <Field label="Security deposit">
                  <Input
                    type="number"
                    min="0"
                    value={form.deposit}
                    onChange={(event) => update("deposit", event.target.value)}
                    className="rounded-xl"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City">
                  <Input
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    className="rounded-xl"
                  />
                </Field>

                <Field label="Locality">
                  <Input
                    value={form.locality}
                    onChange={(event) => update("locality", event.target.value)}
                    className="rounded-xl"
                  />
                </Field>
              </div>

              <Field label="Address">
                <Textarea
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                  className="min-h-20 rounded-xl"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Room type">
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={form.roomType}
                    onChange={(event) => update("roomType", event.target.value)}
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
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={form.furnished}
                    onChange={(event) => update("furnished", event.target.value)}
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
                    onChange={(event) => update("bedrooms", event.target.value)}
                    className="rounded-xl"
                  />
                </Field>

                <Field label="Bathrooms">
                  <Input
                    type="number"
                    min="1"
                    value={form.bathrooms}
                    onChange={(event) => update("bathrooms", event.target.value)}
                    className="rounded-xl"
                  />
                </Field>
              </div>

              <Field label="Preferred gender">
                <select
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.gender}
                  onChange={(event) => update("gender", event.target.value)}
                >
                  <option>Any</option>
                  <option>Boys only</option>
                  <option>Girls only</option>
                  <option>Family</option>
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

          {/* ==================================================
              IMAGES + AMENITIES + LOCATION
              ================================================== */}

          <div className="space-y-6">
            {/* ==================================================
                PROPERTY IMAGES
                ================================================== */}

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Property Images</h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    First image is used as the cover.
                  </p>
                </div>

                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {totalImages}/6
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />

              {totalImages > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {/* Existing images */}
                  {existingImages.map((image, index) => (
                    <div
                      key={image}
                      className="group relative overflow-hidden rounded-xl border border-border bg-muted"
                    >
                      <img
                        src={image}
                        alt={`Property image ${index + 1}`}
                        className="aspect-[4/3] w-full object-cover"
                      />

                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
                          Cover
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow transition hover:bg-background"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  ))}

                  {/* New images */}
                  {newPhotos.map((photo, index) => {
                    const coverIndex = existingImages.length + index;

                    return (
                      <div
                        key={photo.preview}
                        className="group relative overflow-hidden rounded-xl border border-primary/30 bg-muted"
                      >
                        <img
                          src={photo.preview}
                          alt={`New property image ${index + 1}`}
                          className="aspect-[4/3] w-full object-cover"
                        />

                        {coverIndex === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
                            Cover
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow"
                          aria-label={`Remove new image ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>

                        <span className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-[10px] font-medium">
                          New
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                  <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground" />

                  <p className="mt-2 text-sm font-medium">No property images</p>

                  <p className="mt-1 text-xs text-muted-foreground">Add up to 6 photos.</p>
                </div>
              )}

              {totalImages < 6 && (
                <button
                  type="button"
                  onClick={openImagePicker}
                  className="mt-4 flex min-h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                >
                  <Upload className="h-4 w-4 text-primary" />
                  Add New Images
                </button>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                You can have a maximum of 6 images. Removed images will be deleted from property
                storage when you save.
              </p>
            </section>

            {/* ==================================================
                AMENITIES
                ================================================== */}

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold">Amenities</h2>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {AMENITY_LIST.map((amenity) => {
                  const checked = form.amenities.includes(amenity);

                  return (
                    <label
                      key={amenity}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm"
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
            </section>

            {/* ==================================================
                LOCATION
                ================================================== */}

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-bold">Property Location</h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Search for the property, then click the map or drag the pin to the exact location.
                </p>
              </div>

              <div className="mt-4">
                <Field label="Search location">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={locationSearch}
                      onChange={(event) => setLocationSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void searchLocation();
                        }
                      }}
                      placeholder="Search address, locality or landmark"
                      className="rounded-xl"
                    />

                    <Button
                      type="button"
                      onClick={() => void searchLocation()}
                      disabled={locationLoading}
                      className="rounded-xl"
                    >
                      {locationLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}
                      Search
                    </Button>
                  </div>
                </Field>
              </div>

              <div className="mt-4">
                {hasCoordinates ? (
                  <EditableLocationMap
                    latitude={latitude}
                    longitude={longitude}
                    onLocationChange={(newLatitude, newLongitude) => {
                      update("latitude", String(newLatitude));

                      update("longitude", String(newLongitude));
                    }}
                  />
                ) : (
                  <EditableLocationMap
                    latitude={null}
                    longitude={null}
                    onLocationChange={(newLatitude, newLongitude) => {
                      update("latitude", String(newLatitude));

                      update("longitude", String(newLongitude));
                    }}
                  />
                )}
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                <div>
                  <p className="text-sm font-medium text-primary">
                    {hasCoordinates ? "Exact location selected" : "Select exact property location"}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {hasCoordinates
                      ? "Click another point on the map or drag the pin to adjust the property location."
                      : "Search for your property or click anywhere on the map to place the pin."}
                  </p>
                </div>
              </div>
            </section>

            {/* ==================================================
                SAVE
                ================================================== */}

            <Button className="w-full rounded-xl" onClick={() => void save()} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              {saving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
}

/*
 * ============================================================
 * EDITABLE LOCATION MAP
 * ============================================================
 */

function EditableLocationMap({
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

  const callbackRef = useRef(onLocationChange);

  useEffect(() => {
    callbackRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      if (!mapContainerRef.current || initializedRef.current) {
        return;
      }

      const leafletModule = await import("leaflet");

      if (cancelled) {
        return;
      }

      const L = leafletModule.default;

      leafletRef.current = L;

      if (!mapContainerRef.current) {
        return;
      }

      initializedRef.current = true;

      let currentLatitude = latitude;

      let currentLongitude = longitude;

      /*
       * If the property has no saved location,
       * try browser location.
       */
      if (currentLatitude === null || currentLongitude === null) {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                maximumAge: 60000,
                timeout: 10000,
              });
            });

            currentLatitude = position.coords.latitude;

            currentLongitude = position.coords.longitude;
          } catch {
            // User may deny location permission.
          }
        }
      }

      const hasLocation = currentLatitude !== null && currentLongitude !== null;

      const map = L.map(mapContainerRef.current).setView(
        hasLocation ? [currentLatitude!, currentLongitude!] : [20.5937, 78.9629],
        hasLocation ? 17 : 5,
      );

      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markerIcon = L.divIcon({
        className: "room-renter-edit-map-marker",

        html: `
            <div
              style="
                width:36px;
                height:36px;
                display:flex;
                align-items:center;
                justify-content:center;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                background:#2563eb;
                border:3px solid white;
                box-shadow:0 3px 10px rgba(0,0,0,0.3);
              "
            >
              <div
                style="
                  width:10px;
                  height:10px;
                  border-radius:50%;
                  background:white;
                "
              ></div>
            </div>
          `,

        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

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

        marker.on("dragend", () => {
          const position = marker.getLatLng();

          callbackRef.current(position.lat, position.lng);
        });
      };

      if (hasLocation) {
        createMarker(currentLatitude!, currentLongitude!);

        if (latitude === null || longitude === null) {
          callbackRef.current(currentLatitude!, currentLongitude!);
        }
      }

      map.on("click", (event: LeafletMouseEvent) => {
        const lat = event.latlng.lat;

        const lng = event.latlng.lng;

        createMarker(lat, lng);

        callbackRef.current(lat, lng);
      });

      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    };

    void initializeMap();

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

    // Map is intentionally initialized once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Update marker/map after address search.
   */
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || latitude === null || longitude === null) {
      return;
    }

    const map = mapRef.current;

    const L = leafletRef.current;

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const markerIcon = L.divIcon({
        className: "room-renter-edit-map-marker",

        html: `
            <div
              style="
                width:36px;
                height:36px;
                display:flex;
                align-items:center;
                justify-content:center;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                background:#2563eb;
                border:3px solid white;
                box-shadow:0 3px 10px rgba(0,0,0,0.3);
              "
            >
              <div
                style="
                  width:10px;
                  height:10px;
                  border-radius:50%;
                  background:white;
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

        callbackRef.current(position.lat, position.lng);
      });
    }

    map.setView([latitude, longitude], 17, {
      animate: true,
    });
  }, [latitude, longitude]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div ref={mapContainerRef} className="h-[300px] w-full sm:h-[380px]" />

      <div className="flex items-start gap-2 border-t border-border bg-muted/40 px-3 py-3 text-xs leading-5 text-muted-foreground sm:px-4">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />

        <span>
          Click on the map to place the pin, or drag the existing pin to the exact property
          location.
        </span>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * STORAGE PATH HELPER
 * ============================================================
 */

function getStoragePathFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    const marker = "/storage/v1/object/public/property-images/";

    const index = parsed.pathname.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

/*
 * ============================================================
 * FIELD
 * ============================================================
 */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>

      {children}
    </div>
  );
}
