import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  IndianRupee,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type LandlordProperty = {
  id: string | number;
  title?: string | null;
  city?: string | null;
  address?: string | null;
  rent?: number | string | null;
  available?: boolean | null;
};

type Booking = {
  id: number;
  property_id: number;
  renter_id: string;
  visit_date: string;
  visit_time: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  notes?: string | null;
};

export const Route = createFileRoute("/landlord")({
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

  head: () => ({
    meta: [
      { title: "Landlord Dashboard — Room Renter" },
      {
        name: "description",
        content: "Manage your properties, enquiries, bookings and tenants.",
      },
    ],
  }),

  component: LandlordDashboard,
});

function LandlordDashboard() {
  const { user } = useApp();
  const [propertyCount, setPropertyCount] = useState(0);
  const [properties, setProperties] = useState<LandlordProperty[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const loadDashboard = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) return;

    const [
      { data: propertyData, error: propertyError, count },
      { data: bookingData, error: bookingError },
    ] = await Promise.all([
      supabase
        .from("properties")
        .select("id,title,city,address,rent,available", { count: "exact" })
        .eq("landlord_id", currentUser.id)
        .order("id", { ascending: false }),
      supabase
        .from("bookings")
        .select("id,property_id,renter_id,visit_date,visit_time,status,notes")
        .eq("landlord_id", currentUser.id)
        .order("visit_date", { ascending: true })
        .order("visit_time", { ascending: true }),
    ]);

    if (propertyError) {
      console.error("Error loading properties:", propertyError);
      toast.error("Could not load your properties.");
    } else {
      setProperties(propertyData ?? []);
      setPropertyCount(count ?? 0);
    }

    if (bookingError) {
      console.error("Error loading bookings:", bookingError);
      toast.error("Could not load booking requests.");
      setBookings([]);
    } else {
      setBookings((bookingData ?? []) as Booking[]);
    }

    setLoadingBookings(false);
  };

  useEffect(() => {
    void loadDashboard();

    const channel = supabase
      .channel("landlord-bookings-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => void loadDashboard(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const deleteProperty = async (property: LandlordProperty) => {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      `Delete "${property.title || "this property"}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(property.id);

    const { error } = await supabase.from("properties").delete().eq("id", Number(property.id));

    if (error) {
      console.error("Delete property error:", error);
      toast.error(error.message || "Could not delete the property.");
      setDeletingId(null);
      return;
    }

    setProperties((current) => current.filter((item) => item.id !== property.id));
    setPropertyCount((count) => Math.max(0, count - 1));
    toast.success("Property deleted.");
    setDeletingId(null);
  };

  const updateBookingStatus = async (bookingId: number, status: "approved" | "rejected") => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);

    if (error) {
      console.error("Booking status error:", error);
      toast.error(error.message || "Could not update booking.");
      return;
    }

    setBookings((current) =>
      current.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)),
    );
    toast.success(status === "approved" ? "Booking approved." : "Booking rejected.");
  };

  const propertyTitle = (propertyId: number) =>
    properties.find((property) => Number(property.id) === Number(propertyId))?.title ||
    `Property #${propertyId}`;

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Landlord";
  const pendingBookings = bookings.filter((booking) => booking.status === "pending").length;
  const listedRent = properties.reduce((total, property) => total + Number(property.rent || 0), 0);

  return (
    <Page>
      <div className="container-page pb-24 pt-6 sm:py-12">
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-background to-warning/10 p-5 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                Dashboard
              </p>
              <h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back, {name} 👋
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Keep your properties, booking requests, and renter activity moving forward.
              </p>
            </div>

            <Button asChild className="w-full rounded-xl shadow-sm sm:w-auto">
              <Link to="/list-property">
                <Plus className="mr-2 h-4 w-4" />
                List a Property
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatCard
            icon={Building2}
            title="Total Properties"
            value={String(propertyCount)}
            description="Properties listed"
            accent="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          />
          <StatCard
            icon={CalendarDays}
            title="Bookings"
            value={String(bookings.length)}
            description={`${pendingBookings} pending requests`}
            accent="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          />
          <StatCard
            icon={Clock3}
            title="Pending Requests"
            value={String(pendingBookings)}
            description="Need your response"
            accent="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          />
          <StatCard
            icon={IndianRupee}
            title="Listed Rent"
            value={`₹${listedRent.toLocaleString("en-IN")}`}
            description="Combined monthly rent"
            accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          />
        </div>

        <section className="mt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Properties
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Manage your listings</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep track of your listed rooms and their availability.
              </p>
            </div>
            <Button asChild className="w-full rounded-xl sm:w-auto">
              <Link to="/list-property">
                <Plus className="mr-2 h-4 w-4" />
                List a Property
              </Link>
            </Button>
          </div>

          {properties.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total Properties</p>
                <p className="mt-1 text-2xl font-bold">{properties.length}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <p className="text-sm text-emerald-800 dark:text-emerald-300">Available</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                  {properties.filter((property) => property.available).length}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">Unavailable</p>
                <p className="mt-1 text-2xl font-bold">
                  {properties.filter((property) => !property.available).length}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {properties.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center sm:col-span-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">No properties yet</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  List your first room or property and start receiving enquiries from renters.
                </p>
                <Button asChild className="mt-5 rounded-xl">
                  <Link to="/list-property">
                    <Plus className="mr-2 h-4 w-4" />
                    List Your Property
                  </Link>
                </Button>
              </div>
            ) : (
              properties.map((property) => (
                <div
                  key={property.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                >
                  <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-primary/10 via-accent/30 to-warning/10">
                    <Building2 className="h-10 w-10 text-primary/60" />
                    <span
                      className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        property.available
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {property.available ? <Check className="h-3.5 w-3.5" /> : null}
                      {property.available ? "Available" : "Unavailable"}
                    </span>
                    <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {property.available ? "Active listing" : "Needs attention"}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5">
                    <h3 className="line-clamp-1 break-words text-lg font-bold">
                      {property.title || "Untitled property"}
                    </h3>
                    <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="line-clamp-2">
                        {property.city || "Location not specified"}
                        {property.address ? ` · ${property.address}` : ""}
                      </span>
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="font-semibold text-foreground">
                        ₹{Number(property.rent || 0).toLocaleString("en-IN")}
                        <span className="text-sm font-normal text-muted-foreground"> / month</span>
                      </span>
                      <span className="text-xs text-muted-foreground">Property listing</span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
                      <Button asChild variant="outline" className="min-h-10 rounded-xl px-2">
                        <Link to="/property/$id" params={{ id: String(property.id) }}>
                          <Eye className="mr-1.5 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="min-h-10 rounded-xl px-2">
                        <Link to="/edit-property" search={{ id: String(property.id) }}>
                          <Pencil className="mr-1.5 h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-10 rounded-xl px-3 text-destructive hover:text-destructive"
                        title="Delete property"
                        disabled={deletingId === property.id}
                        onClick={() => void deleteProperty(property)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete property</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Activity
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Recent Requests</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Requests from renters are updated here in real time.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full rounded-xl sm:mt-0 sm:w-auto">
              <Link to="/bookings">
                Open bookings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            {loadingBookings ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading booking requests...
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No booking requests yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {bookings.slice(0, 8).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                          <CalendarDays className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="break-words font-semibold">
                            {propertyTitle(booking.property_id)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatBookingDate(booking.visit_date)} at{" "}
                            {formatBookingTime(booking.visit_time)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Renter ID: {booking.renter_id.slice(0, 8)}…
                          </p>
                          {booking.notes ? (
                            <p className="mt-2 text-sm text-muted-foreground">{booking.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      <BookingBadge status={booking.status} />
                      {booking.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            className="min-h-9 flex-1 rounded-lg sm:flex-none"
                            onClick={() => void updateBookingStatus(booking.id, "approved")}
                          >
                            <Check className="mr-1.5 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-9 flex-1 rounded-lg text-destructive hover:text-destructive sm:flex-none"
                            onClick={() => void updateBookingStatus(booking.id, "rejected")}
                          >
                            <X className="mr-1.5 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
            Shortcuts
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Quick Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            <ActionCard
              icon={Plus}
              title="List a Property"
              description="Add a new room or property."
              href="/list-property"
            />
            <ActionCard
              icon={MessageSquare}
              title="View Enquiries"
              description="Respond to renter enquiries."
              href="/messages"
            />
            <ActionCard
              icon={CalendarDays}
              title="Booking Requests"
              description="Manage incoming booking requests."
              href="/bookings"
            />
          </div>
        </section>
      </div>
    </Page>
  );
}

function formatBookingDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatBookingTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function BookingBadge({ status }: { status: string }) {
  const classes =
    status === "approved" || status === "confirmed"
      ? "bg-success/15 text-success"
      : status === "completed"
        ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
        : status === "rejected" || status === "cancelled"
          ? "bg-destructive/10 text-destructive"
          : "bg-warning/15 text-warning-foreground";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${classes}`}>
      {status}
    </span>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  description,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-2xl font-bold tracking-tight sm:text-3xl">{value}</span>
      </div>
      <h3 className="mt-4 break-words font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card)] sm:p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
      <h3 className="mt-4 break-words font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
