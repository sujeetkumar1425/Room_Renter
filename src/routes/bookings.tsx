import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  Check,
  Clock3,
  Home,
  Loader2,
  Trash2,
  X,
  MapPin,
  Eye,
  UserRound,
} from "lucide-react";

import { Page } from "@/components/Layout";

import { Button } from "@/components/ui/button";

import { supabase } from "@/lib/supabase";

import { toast } from "sonner";

import { cn } from "@/lib/utils";

type Booking = {
  id: number;

  property_id: number;

  renter_id: string;

  landlord_id: string;

  visit_date: string;

  visit_time: string;

  status: "pending" | "approved" | "rejected" | "cancelled" | string;

  notes: string | null;
};

type PropertyLookup = {
  id: number;

  title: string | null;

  address: string | null;

  images?: string[] | null;

  room_type?: string | null;

  furnished?: string | boolean | null;

  bedrooms?: number | null;

  bathrooms?: number | null;
};

type RenterLookup = {
  id: string;

  full_name: string | null;
};

function getPropertyImage(images: string[] | null | undefined) {
  const image = images?.find((value) => value?.trim());

  if (!image) return null;

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("/") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  return supabase.storage.from("property-images").getPublicUrl(image).data.publicUrl;
}

export const Route = createFileRoute("/bookings")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw redirect({ to: "/login" });
  },

  component: BookingsPage,
});

function BookingsPage() {
  const [role, setRole] = useState<"renter" | "landlord">("renter");

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [properties, setProperties] = useState<PropertyLookup[]>([]);

  const [renters, setRenters] = useState<RenterLookup[]>([]);

  const [loading, setLoading] = useState(true);

  const [workingId, setWorkingId] = useState<number | null>(null);

  const [filter, setFilter] = useState("all");

  const [clearedBookingIds, setClearedBookingIds] = useState<number[]>([]);

  const [confirmation, setConfirmation] = useState<{ type: "cancel" | "clear"; id: number } | null>(
    null,
  );
  const [landlordClearId, setLandlordClearId] = useState<number | null>(null);

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile } = await supabase

      .from("profiles")

      .select("role")

      .eq("id", user.id)

      .maybeSingle();

    const currentRole = profile?.role === "landlord" ? "landlord" : "renter";

    setRole(currentRole);

    const bookingQuery = supabase

      .from("bookings")

      .select("id,property_id,renter_id,landlord_id,visit_date,visit_time,status,notes")

      .order("visit_date", { ascending: true })

      .order("visit_time", { ascending: true });

    const { data: bookingData, error: bookingError } =
      currentRole === "landlord"
        ? await bookingQuery.eq("landlord_id", user.id)
        : await bookingQuery.eq("renter_id", user.id);

    if (bookingError) {
      console.error("Load bookings:", bookingError);

      toast.error(bookingError.message || "Could not load bookings.");

      setLoading(false);

      return;
    }

    const bookingRows = (bookingData ?? []) as Booking[];

    setBookings(bookingRows);

    const propertyIds = [...new Set(bookingRows.map((booking) => booking.property_id))];

    if (propertyIds.length) {
      const { data: propertyData, error: propertyError } = await supabase

        .from("properties")

        .select("id,title,address,images,room_type,furnished,bedrooms,bathrooms")

        .in("id", propertyIds);

      if (propertyError) {
        console.error("Load booking properties:", propertyError);
      } else {
        setProperties((propertyData ?? []) as PropertyLookup[]);
      }
    } else {
      setProperties([]);
    }

    const renterIds = [...new Set(bookingRows.map((booking) => booking.renter_id))];

    if (renterIds.length) {
      const { data: renterData, error: renterError } = await supabase

        .from("profiles")

        .select("id,full_name")

        .in("id", renterIds);

      if (renterError) {
        console.error("Load booking renters:", renterError);
      } else {
        setRenters((renterData ?? []) as RenterLookup[]);
      }
    } else {
      setRenters([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();

    const channel = supabase

      .channel("bookings-page-realtime")

      .on(
        "postgres_changes",

        { event: "*", schema: "public", table: "bookings" },

        () => void load(),
      )

      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const propertyMap = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),

    [properties],
  );

  const renterMap = useMemo(
    () => new Map(renters.map((renter) => [renter.id, renter])),

    [renters],
  );

  const filteredBookings = useMemo(() => {
    const visibleBookings = bookings.filter((booking) => !clearedBookingIds.includes(booking.id));

    if (filter === "all") return visibleBookings;

    if (filter === "upcoming") {
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      return visibleBookings.filter((booking) => {
        const visitDate = new Date(`${booking.visit_date}T00:00:00`);

        return booking.status === "approved" && visitDate >= today;
      });
    }

    return visibleBookings.filter((booking) => booking.status === filter);
  }, [bookings, clearedBookingIds, filter]);

  const clearBooking = (id: number) => {
    setClearedBookingIds((current) => (current.includes(id) ? current : [...current, id]));

    // Remove it immediately from the current list.
    setBookings((current) => current.filter((booking) => booking.id !== id));

    setConfirmation(null);
    toast.success("Booking cleared from your list.");
  };

  const confirmBookingAction = async () => {
    if (!confirmation) return;

    const action = confirmation;

    setConfirmation(null);

    if (action.type === "clear") {
      clearBooking(action.id);

      return;
    }

    await updateStatus(action.id, "cancelled");
  };

  const updateStatus = async (id: number, status: "approved" | "rejected" | "cancelled") => {
    if (workingId !== null) return;

    setWorkingId(id);

    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);

    if (error) {
      console.error("Update booking status:", error);

      toast.error(error.message || "Could not update booking.");

      setWorkingId(null);

      return;
    }

    setBookings((current) =>
      current.map((booking) => (booking.id === id ? { ...booking, status } : booking)),
    );

    toast.success(
      status === "approved"
        ? "Booking approved."
        : status === "rejected"
          ? "Booking rejected."
          : "Booking cancelled.",
    );

    setWorkingId(null);
  };

  const visibleBookings =
    role === "renter"
      ? bookings.filter((booking) => !clearedBookingIds.includes(booking.id))
      : bookings;

  if (role === "renter") {
    const renterFilters = [
      ["all", "All"],

      ["pending", "Upcoming"],

      ["approved", "Accepted"],

      ["cancelled", "Cancelled"],
    ] as const;

    const renterFilteredBookings = visibleBookings.filter((booking) => {
      if (filter === "all") return true;

      if (filter === "cancelled") {
        return booking.status === "cancelled" || booking.status === "rejected";
      }

      if (filter === "pending") return booking.status === "pending";

      if (filter === "approved") return booking.status === "approved";

      return true;
    });

    return (
      <Page>
        <div className="container-page overflow-x-hidden pb-24 pt-4 sm:py-10">
          {/* Compact mobile-first header */}

          <section className="rounded-2xl border border-primary/10 bg-primary/[0.04] px-3.5 py-3.5 sm:rounded-3xl sm:px-5 sm:py-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs">
              Room Seeker
            </p>

            <h1 className="mt-1 text-[21px] font-extrabold tracking-tight text-foreground sm:text-3xl">
              Bookings & Visits
            </h1>

            <p className="mt-1 text-[10px] leading-4 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">
              Track your room visits and their current status.
            </p>
          </section>

          {/* Status filters */}

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:mt-5 sm:gap-2">
            {renterFilters.map(([value, label]) => {
              const count =
                value === "all"
                  ? visibleBookings.length
                  : value === "pending"
                    ? visibleBookings.filter((booking) => booking.status === "pending").length
                    : value === "approved"
                      ? visibleBookings.filter((booking) => booking.status === "approved").length
                      : visibleBookings.filter(
                          (booking) =>
                            booking.status === "cancelled" || booking.status === "rejected",
                        ).length;

              const active = filter === value;

              return (
                <button
                  key={value}

                  type="button"

                  onClick={() => setFilter(value)}

                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-bold transition-colors sm:px-3.5 sm:py-2 sm:text-xs",

                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {label} <span className="opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-2.5 sm:mt-5 sm:space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground sm:p-10 sm:text-sm">
                Loading bookings...
              </div>
            ) : renterFilteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-10">
                <CalendarDays className="mx-auto h-9 w-9 text-primary" />

                <h2 className="mt-3 text-sm font-bold sm:text-base">No bookings yet</h2>

                <p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-muted-foreground sm:text-sm sm:leading-5">
                  Open a property and schedule a visit to create your first booking.
                </p>

                <Button asChild className="mt-4 h-9 rounded-xl px-4 text-xs">
                  <Link
                    to="/search"

                    search={{
                      city: undefined,

                      type: undefined,

                      budget: undefined,
                    }}
                  >
                    Find a room
                  </Link>
                </Button>
              </div>
            ) : (
              renterFilteredBookings.map((booking) => {
                const property = propertyMap.get(booking.property_id);

                const isCancelled = booking.status === "cancelled";

                const isRejected = booking.status === "rejected";

                const canCancel = booking.status === "pending" || booking.status === "approved";

                return (
                  <article
                    key={booking.id}

                    className="overflow-hidden rounded-2xl border border-border/80 bg-card px-3 py-2.5 shadow-[var(--shadow-soft)] sm:p-5"
                  >
                    {/* Property row */}

                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className="relative h-[72px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-28">
                        {getPropertyImage(property?.images) ? (
                          <img
                            src={getPropertyImage(property?.images) ?? undefined}

                            alt={property?.title || "Property"}

                            className="h-full w-full object-cover"

                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-primary/50">
                            <Home className="h-4 w-4 sm:h-6 sm:w-6" />

                            <span className="text-[6px] font-medium sm:text-[8px]">No image</span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <h2 className="line-clamp-1 text-[10px] font-extrabold leading-4 text-foreground sm:text-base sm:leading-5">
                              {property?.title || `Property #${booking.property_id}`}
                            </h2>

                            {property?.address ? (
                              <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[8px] leading-3 text-muted-foreground sm:text-xs sm:leading-4">
                                <MapPin className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />

                                <span className="truncate">{property.address}</span>
                              </p>
                            ) : null}
                          </div>

                          <StatusBadge status={booking.status} />
                        </div>

                        {/* Date/time */}

                        <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[8px] font-medium leading-3 sm:px-2.5 sm:py-1 sm:text-xs sm:leading-4">
                            <CalendarDays className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />

                            {formatDate(booking.visit_date)}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[8px] font-medium leading-3 sm:px-2.5 sm:py-1 sm:text-xs sm:leading-4">
                            <Clock3 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />

                            {formatTime(booking.visit_time)}
                          </span>
                        </div>

                        {/* Renter's message */}

                        {booking.notes ? (
                          <p className="mt-2 line-clamp-2 rounded-xl bg-muted px-2.5 py-2 text-[8px] leading-3.5 text-muted-foreground sm:mt-3 sm:px-3 sm:py-2.5 sm:text-xs sm:leading-5">
                            {booking.notes}
                          </p>
                        ) : null}

                        {/* Actions */}

                        <div className="mt-2 flex min-h-5 items-center justify-end gap-1.5 sm:mt-3 sm:gap-2">
                          {canCancel ? (
                            <Button
                              variant="outline"

                              size="sm"

                              className="h-6 rounded-full border-destructive/20 px-2.5 text-[8px] text-destructive hover:text-destructive sm:h-8 sm:rounded-lg sm:px-3 sm:text-xs"

                              disabled={workingId === booking.id}

                              onClick={() => setConfirmation({ type: "cancel", id: booking.id })}
                            >
                              <X className="mr-1 h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                              Cancel
                            </Button>
                          ) : null}

                          {isCancelled || isRejected ? (
                            <Button
                              variant="ghost"

                              size="sm"

                              className="h-6 rounded-full px-2.5 text-[8px] text-muted-foreground sm:h-8 sm:rounded-lg sm:px-3 sm:text-xs"

                              onClick={() => setConfirmation({ type: "clear", id: booking.id })}
                            >
                              <Trash2 className="mr-1 h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                              Clear
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {confirmation ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"

            role="presentation"

            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setConfirmation(null);
            }}
          >
            <div
              role="dialog"

              aria-modal="true"

              aria-labelledby="booking-confirmation-title"

              className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                {confirmation.type === "cancel" ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Trash2 className="h-6 w-6" />
                )}
              </div>

              <h2
                id="booking-confirmation-title"
                className="mt-4 text-center text-lg font-extrabold"
              >
                {confirmation.type === "cancel" ? "Cancel booking?" : "Clear this booking?"}
              </h2>

              <p className="mt-2 text-center text-sm leading-5 text-muted-foreground">
                {confirmation.type === "cancel"
                  ? "Are you sure you want to cancel this visit? This action cannot be undone."
                  : "This will remove the booking from your list. You can’t undo this action."}
              </p>

              <div className="mt-5 grid gap-2">
                <Button
                  type="button"

                  variant="destructive"

                  className="h-10 rounded-xl"

                  disabled={workingId !== null}

                  onClick={() => void confirmBookingAction()}
                >
                  {confirmation.type === "cancel" ? "Yes, Cancel" : "Yes, Clear"}
                </Button>

                <Button
                  type="button"

                  variant="outline"

                  className="h-10 rounded-xl"

                  onClick={() => setConfirmation(null)}
                >
                  Keep it
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Page>
    );
  }

  const landlordVisibleBookings = bookings.filter(
    (booking) => !clearedBookingIds.includes(booking.id),
  );

  const landlordCounts = {
    all: landlordVisibleBookings.length,

    pending: landlordVisibleBookings.filter((booking) => booking.status === "pending").length,

    approved: landlordVisibleBookings.filter((booking) => booking.status === "approved").length,

    cancelled: landlordVisibleBookings.filter(
      (booking) => booking.status === "cancelled" || booking.status === "rejected",
    ).length,
  };

  const landlordFilterBookings = landlordVisibleBookings.filter((booking) => {
    if (filter === "all") return true;

    if (filter === "cancelled") {
      return booking.status === "cancelled" || booking.status === "rejected";
    }

    return booking.status === filter;
  });

  return (
    <Page>
      <div className="container-page overflow-x-hidden pb-28 pt-5 sm:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.08] via-background to-primary/[0.04] px-5 pb-6 pt-6 shadow-sm sm:px-7">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-primary/10" />

          <div className="pointer-events-none absolute right-14 top-12 h-20 w-20 rounded-full bg-primary/10" />

          <div className="relative pr-20 sm:pr-28">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Landlord
            </p>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Bookings & Visits
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Manage renter requests, approve visits, and keep cancelled requests organised.
            </p>
          </div>

          <div className="absolute right-5 top-8 hidden h-24 w-24 items-center justify-center rounded-[2rem] bg-primary/10 sm:flex">
            <CalendarDays className="h-12 w-12 text-primary/70" strokeWidth={1.5} />
          </div>
        </section>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {[
            ["all", "All"],

            ["pending", "Pending"],

            ["approved", "Accepted"],

            ["cancelled", "Cancelled"],
          ].map(([value, label]) => (
            <button
              key={value}

              type="button"

              onClick={() => setFilter(value)}

              className={cn(
                "shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition-colors",

                filter === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {label}

              <span className="ml-1 opacity-70">
                {landlordCounts[value as keyof typeof landlordCounts]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Loading bookings...
            </div>
          ) : landlordFilterBookings.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-10 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-primary" />

              <h2 className="mt-4 font-semibold">No booking requests</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                New renter visit requests will appear here.
              </p>
            </div>
          ) : (
            landlordFilterBookings.map((booking) => {
              const property = propertyMap.get(booking.property_id);

              const renter = renterMap.get(booking.renter_id);

              const image = property?.images?.[0];

              const isPending = booking.status === "pending";

              const isCancelled = booking.status === "cancelled";

              return (
                <article
                  key={booking.id}

                  className="overflow-hidden rounded-3xl border border-border/80 bg-card p-3 shadow-[var(--shadow-soft)] sm:p-5"
                >
                  <div className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-3 sm:flex sm:gap-5">
                    <div className="relative h-[118px] w-[104px] shrink-0 overflow-hidden rounded-2xl bg-muted sm:h-36 sm:w-40">
                      {image ? (
                        <img
                          src={image}

                          alt={property?.title || "Property"}

                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary/50">
                          <Home className="h-8 w-8" />
                        </div>
                      )}

                      <div className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[8px] font-bold capitalize shadow-sm">
                        {booking.status}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="line-clamp-2 text-[12px] font-extrabold leading-4 tracking-tight sm:text-lg sm:leading-6">
                            {property?.title || `Property #${booking.property_id}`}
                          </h2>

                          {property?.address ? (
                            <p className="mt-1 flex items-start gap-1 text-[9px] leading-3.5 text-muted-foreground sm:text-xs sm:leading-5">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />

                              <span className="line-clamp-2">{property.address}</span>
                            </p>
                          ) : null}
                        </div>

                        <StatusBadge status={booking.status} />
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {property?.room_type ? (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-semibold sm:px-2.5 sm:py-1 sm:text-[10px]">
                            {property.room_type}
                          </span>
                        ) : null}

                        {property?.furnished ? (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-semibold sm:px-2.5 sm:py-1 sm:text-[10px]">
                            {String(property.furnished)}
                          </span>
                        ) : null}

                        {property?.bedrooms ? (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-semibold sm:px-2.5 sm:py-1 sm:text-[10px]">
                            {property.bedrooms} BHK
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex min-w-0 items-center gap-2 rounded-xl bg-muted/60 px-2 py-1.5 sm:mt-3 sm:rounded-2xl sm:p-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-9 sm:w-9">
                          <UserRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[9px] font-bold sm:text-xs">
                            {renter?.full_name?.trim() || "Renter"}
                          </p>

                          <p className="text-[8px] text-muted-foreground sm:text-[10px]">Renter</p>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[9px] font-semibold sm:px-2.5 sm:py-1.5 sm:text-xs">
                          <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5" />

                          {formatDate(booking.visit_date)}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[9px] font-semibold sm:px-2.5 sm:py-1.5 sm:text-xs">
                          <Clock3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />

                          {formatTime(booking.visit_time)}
                        </span>
                      </div>

                      {booking.notes ? (
                        <p className="mt-2 line-clamp-2 rounded-xl bg-muted px-2.5 py-1.5 text-[9px] leading-3.5 text-muted-foreground sm:mt-3 sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-xs sm:leading-5">
                          {booking.notes}
                        </p>
                      ) : null}

                      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-4 sm:flex sm:flex-wrap sm:gap-2">
                        <Button
                          variant="outline"

                          size="sm"

                          className="h-8 min-w-0 rounded-lg px-2 text-[9px] sm:h-9 sm:rounded-xl sm:px-3 sm:text-xs"
                        >
                          <Eye className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          View Details
                        </Button>

                        {isPending ? (
                          <>
                            <Button
                              size="sm"

                              className="h-8 min-w-0 rounded-lg px-2 text-[9px] sm:h-9 sm:rounded-xl sm:px-3 sm:text-xs"

                              disabled={workingId === booking.id}

                              onClick={() => void updateStatus(booking.id, "approved")}
                            >
                              {workingId === booking.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="mr-1 h-3 w-3" />
                              )}
                              Approve
                            </Button>

                            <Button
                              variant="outline"

                              size="sm"

                              className="h-8 min-w-0 rounded-lg border-destructive/30 px-2 text-[9px] text-destructive hover:text-destructive sm:h-9 sm:rounded-xl sm:px-3 sm:text-xs"

                              disabled={workingId === booking.id}

                              onClick={() => void updateStatus(booking.id, "rejected")}
                            >
                              <X className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          </>
                        ) : null}

                        {isCancelled ? (
                          <Button
                            variant="outline"

                            size="sm"

                            className="h-8 min-w-0 rounded-lg px-2 text-[9px] text-muted-foreground sm:h-9 sm:rounded-xl sm:px-3 sm:text-xs"

                            onClick={() => setLandlordClearId(booking.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Clear
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {landlordClearId !== null ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLandlordClearId(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="landlord-clear-title"
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-6 w-6" />
            </div>

            <h2 id="landlord-clear-title" className="mt-4 text-center text-lg font-extrabold">
              Clear this booking?
            </h2>

            <p className="mt-2 text-center text-sm leading-5 text-muted-foreground">
              This will remove the booking from your list. You can&apos;t undo this action.
            </p>

            <div className="mt-5 grid gap-2">
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-xl"
                onClick={() => {
                  const id = landlordClearId;
                  setLandlordClearId(null);
                  clearBooking(id);
                }}
              >
                Yes, Clear
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setLandlordClearId(null)}
              >
                Keep it
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Page>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "approved"
      ? "bg-success/15 text-success"
      : status === "rejected" || status === "cancelled"
        ? "bg-destructive/10 text-destructive"
        : "bg-warning/15 text-warning-foreground";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${classes}`}>
      {status}
    </span>
  );
}
