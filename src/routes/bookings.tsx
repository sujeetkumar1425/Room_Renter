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

    toast.success("Booking cleared from your list.");
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
    return (
      <Page>
        <div className="container-page overflow-x-hidden pb-28 pt-6 sm:py-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Room Seeker
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Bookings & Visits
            </h1>

            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Track your room visits and their current status.
            </p>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {[
              ["all", "All"],

              ["pending", "Upcoming"],

              ["approved", "Accepted"],

              ["cancelled", "Cancelled"],
            ].map(([value, label]) => {
              const count =
                value === "all"
                  ? visibleBookings.length
                  : visibleBookings.filter((booking) =>
                      value === "approved"
                        ? booking.status === "approved"
                        : value === "cancelled"
                          ? booking.status === "cancelled"
                          : value === "pending"
                            ? booking.status === "pending"
                            : false,
                    ).length;

              return (
                <span
                  key={value}

                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold",

                    value === "all"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground",
                  )}
                >
                  {label}

                  <span className="ml-1 opacity-70">{count}</span>
                </span>
              );
            })}
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                Loading bookings...
              </div>
            ) : visibleBookings.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-primary" />

                <h2 className="mt-4 font-semibold">No bookings yet</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Open a property and schedule a visit to create your first booking.
                </p>

                <Button asChild className="mt-5 rounded-xl">
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
              visibleBookings.map((booking) => {
                const property = propertyMap.get(booking.property_id);

                return (
                  <article
                    key={booking.id}

                    className="rounded-2xl border border-border/80 bg-card p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)] sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Home className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="truncate text-base font-bold">
                              {property?.title || `Property #${booking.property_id}`}
                            </h2>

                            {property?.address ? (
                              <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />

                                {property.address}
                              </p>
                            ) : null}
                          </div>

                          <StatusBadge status={booking.status} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            <CalendarDays className="h-3.5 w-3.5" />

                            {formatDate(booking.visit_date)}
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            <Clock3 className="h-3.5 w-3.5" />

                            {formatTime(booking.visit_time)}
                          </span>
                        </div>

                        {booking.notes ? (
                          <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                            {booking.notes}
                          </p>
                        ) : null}

                        <div className="mt-3 flex items-center justify-between gap-2">
                          {booking.status === "pending" || booking.status === "approved" ? (
                            <Button
                              variant="outline"

                              size="sm"

                              className="rounded-lg text-destructive hover:text-destructive"

                              disabled={workingId === booking.id}

                              onClick={() => void updateStatus(booking.id, "cancelled")}
                            >
                              <X className="mr-1.5 h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          ) : (
                            <span />
                          )}

                          {booking.status === "cancelled" || booking.status === "rejected" ? (
                            <Button
                              variant="ghost"

                              size="sm"

                              className="rounded-lg text-muted-foreground"

                              onClick={() => clearBooking(booking.id)}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
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
                            onClick={() => clearBooking(booking.id)}
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
