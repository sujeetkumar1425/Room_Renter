import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, Home, Loader2, X } from "lucide-react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

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
        .select("id,title,address")
        .in("id", propertyIds);

      if (propertyError) {
        console.error("Load booking properties:", propertyError);
      } else {
        setProperties((propertyData ?? []) as PropertyLookup[]);
      }
    } else {
      setProperties([]);
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

  const filteredBookings = useMemo(() => {
    if (filter === "all") return bookings;
    if (filter === "upcoming") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return bookings.filter((booking) => {
        const visitDate = new Date(`${booking.visit_date}T00:00:00`);
        return booking.status === "approved" && visitDate >= today;
      });
    }
    return bookings.filter((booking) => booking.status === filter);
  }, [bookings, filter]);

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

  return (
    <Page>
      <div className="container-page overflow-x-hidden pb-28 pt-6 sm:py-12">
        <p className="text-sm font-medium text-primary">
          {role === "landlord" ? "Landlord" : "Room Seeker"}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Bookings & Visits</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {role === "landlord"
            ? "Review renter visit requests and approve or reject them."
            : "Track your room visit requests and their current status."}
        </p>

        {role === "landlord" ? (
          <div className="mt-6 overflow-x-auto pb-1 sm:mt-8">
            <div
              className="flex min-w-max gap-2"
              role="tablist"
              aria-label="Booking status filters"
            >
              {[
                ["all", "All"],
                ["pending", "Pending"],
                ["approved", "Accepted"],
                ["upcoming", "Upcoming"],
                ["rejected", "Rejected"],
                ["cancelled", "Cancelled"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => setFilter(value)}
                  className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                    filter === value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {label}
                  <span className="ml-1.5 opacity-75">
                    {value === "all"
                      ? bookings.length
                      : value === "upcoming"
                        ? bookings.filter((booking) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return (
                              booking.status === "approved" &&
                              new Date(`${booking.visit_date}T00:00:00`) >= today
                            );
                          }).length
                        : bookings.filter((booking) => booking.status === value).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4 sm:mt-8">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground sm:p-10">
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10">
              <CalendarDays className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 font-semibold">No bookings yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {role === "landlord"
                  ? "New renter visit requests will appear here."
                  : "Open a property and schedule a visit to create your first booking."}
              </p>
              {role === "renter" ? (
                <Button asChild className="mt-5 w-full rounded-xl sm:w-auto">
                  <Link
                    to="/search"
                    search={{ city: undefined, type: undefined, budget: undefined }}
                  >
                    Find a room
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 font-semibold">
                No {filter === "all" ? "" : filter === "upcoming" ? "upcoming " : `${filter} `}
                bookings
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === "pending"
                  ? "New renter requests will appear here."
                  : "There are no bookings in this category yet."}
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const property = propertyMap.get(booking.property_id);
              return (
                <article
                  key={booking.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)] sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Home className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="min-w-0 break-words font-semibold">
                            {property?.title || `Property #${booking.property_id}`}
                          </h2>
                          <StatusBadge status={booking.status} />
                        </div>
                      </div>

                      {property?.address ? (
                        <p className="mt-1 text-sm text-muted-foreground">{property.address}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(booking.visit_date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatTime(booking.visit_time)}
                        </span>
                      </div>

                      {role === "landlord" ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Renter: {booking.renter_id.slice(0, 8)}…
                        </p>
                      ) : null}

                      {booking.notes ? (
                        <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                          {booking.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                      {role === "landlord" && booking.status === "pending" ? (
                        <>
                          <Button
                            className="rounded-lg"
                            disabled={workingId === booking.id}
                            onClick={() => void updateStatus(booking.id, "approved")}
                          >
                            {workingId === booking.id ? (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-1.5 h-4 w-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-lg text-destructive hover:text-destructive"
                            disabled={workingId === booking.id}
                            onClick={() => void updateStatus(booking.id, "rejected")}
                          >
                            <X className="mr-1.5 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      ) : null}

                      {role === "renter" &&
                      (booking.status === "pending" || booking.status === "approved") ? (
                        <Button
                          variant="outline"
                          className="rounded-lg text-destructive hover:text-destructive"
                          disabled={workingId === booking.id}
                          onClick={() => void updateStatus(booking.id, "cancelled")}
                        >
                          Cancel
                        </Button>
                      ) : null}
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
