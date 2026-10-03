import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  User,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase";

type ApprovedBooking = {
  id: number;
  property_id: number;
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

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({
        to: "/login",
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role === "landlord") {
      throw redirect({
        to: "/landlord",
      });
    }
  },

  head: () => ({
    meta: [
      {
        title: "My Dashboard — Room Renter",
      },
      {
        name: "description",
        content: "Manage your saved rooms, visits, messages and rental activity.",
      },
    ],
  }),

  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useApp();

  const [approvedBookings, setApprovedBookings] = useState<ApprovedBooking[]>([]);
  const [properties, setProperties] = useState<PropertyLookup[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  const loadApprovedBookings = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setLoadingBookings(false);
      return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("id,property_id,visit_date,visit_time,status,notes")
      .eq("renter_id", currentUser.id)
      .eq("status", "approved")
      .order("visit_date", { ascending: true })
      .order("visit_time", { ascending: true });

    if (error) {
      console.error("Load approved bookings:", error);
      setLoadingBookings(false);
      return;
    }

    const bookingRows = (data ?? []) as ApprovedBooking[];

    setApprovedBookings(bookingRows);

    const propertyIds = [...new Set(bookingRows.map((booking) => booking.property_id))];

    if (propertyIds.length === 0) {
      setProperties([]);
      setLoadingBookings(false);
      return;
    }

    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select("id,title,address")
      .in("id", propertyIds);

    if (propertyError) {
      console.error("Load approved booking properties:", propertyError);
      setProperties([]);
    } else {
      setProperties((propertyData ?? []) as PropertyLookup[]);
    }

    setLoadingBookings(false);
  };

  useEffect(() => {
    void loadApprovedBookings();

    const channel = supabase
      .channel("renter-dashboard-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          void loadApprovedBookings();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const propertyMap = new Map(properties.map((property) => [property.id, property]));

  const nextVisit = approvedBookings[0];

  return (
    <Page>
      <div className="container-page px-4 py-6 sm:px-6 sm:py-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                Renter Dashboard
              </span>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Welcome back, {name} 👋
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Keep track of your room search, visits and rental activity from one place.
              </p>
            </div>

            <Button asChild className="rounded-xl">
              <Link
                to="/search"
                search={{
                  city: undefined,
                  type: undefined,
                  budget: undefined,
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                Find a Room
              </Link>
            </Button>
          </div>
        </section>

        {/* QUICK STATS / ACTIONS */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            icon={Heart}
            title="Saved Rooms"
            description="View properties you've saved."
            href="/saved"
          />

          <DashboardCard
            icon={CalendarDays}
            title="My Bookings"
            description={
              approvedBookings.length > 0
                ? `${approvedBookings.length} approved visit${
                    approvedBookings.length > 1 ? "s" : ""
                  }`
                : "Check your booking requests."
            }
            href="/bookings"
          />

          <DashboardCard
            icon={MessageSquare}
            title="Messages"
            description="Chat directly with property owners."
            href="/messages"
          />

          <DashboardCard
            icon={User}
            title="My Profile"
            description="Update your renter information."
            href="/profile"
          />
        </section>

        {/* UPCOMING VISIT */}
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">UP NEXT</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Upcoming Visit</h2>
            </div>

            <Button asChild variant="ghost" className="rounded-xl">
              <Link to="/bookings">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4">
            {loadingBookings ? (
              <div className="rounded-3xl border border-border bg-card p-10 text-center">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Loading your visits...</p>
              </div>
            ) : !nextVisit ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center sm:p-10">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>

                <h3 className="mt-4 text-lg font-bold">No approved visits yet</h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Once a landlord approves your visit request, your upcoming visit will appear here.
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
                    <Search className="mr-2 h-4 w-4" />
                    Explore Rooms
                  </Link>
                </Button>
              </div>
            ) : (
              <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <div className="h-2 bg-primary" />

                <div className="p-5 sm:p-7">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                        <CheckCircle2 className="h-7 w-7 text-primary" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">
                            {propertyMap.get(nextVisit.property_id)?.title ||
                              `Property #${nextVisit.property_id}`}
                          </h3>

                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                            Approved
                          </span>
                        </div>

                        {propertyMap.get(nextVisit.property_id)?.address ? (
                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {propertyMap.get(nextVisit.property_id)?.address}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <Button asChild variant="outline" className="rounded-xl">
                      <Link to="/bookings">
                        View Booking
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <InfoPill
                      icon={CalendarDays}
                      label="Visit date"
                      value={formatDate(nextVisit.visit_date)}
                    />

                    <InfoPill
                      icon={Clock3}
                      label="Visit time"
                      value={formatTime(nextVisit.visit_time)}
                    />
                  </div>

                  {nextVisit.notes ? (
                    <div className="mt-4 rounded-2xl bg-muted/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Notes
                      </p>
                      <p className="mt-1 text-sm">{nextVisit.notes}</p>
                    </div>
                  ) : null}
                </div>
              </article>
            )}
          </div>
        </section>

        {/* LOWER GRID */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          {/* RECENT ACTIVITY */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Recent Activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A quick look at your rental activity.
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Clock3 className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {approvedBookings.length === 0 ? (
                <div className="rounded-2xl bg-muted/50 p-5 text-center">
                  <Search className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold">No recent activity</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start exploring rooms to begin your rental journey.
                  </p>
                </div>
              ) : (
                approvedBookings.slice(0, 3).map((booking) => {
                  const property = propertyMap.get(booking.property_id);

                  return (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">Visit approved</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {property?.title || `Property #${booking.property_id}`}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {formatDate(booking.visit_date)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-bold">Quick Actions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Jump straight to what you need.</p>

            <div className="mt-5 space-y-3">
              <QuickAction
                icon={Search}
                title="Find a Room"
                description="Explore available properties"
                href="/search"
              />

              <QuickAction
                icon={Heart}
                title="Saved Rooms"
                description="View your favorite properties"
                href="/saved"
              />

              <QuickAction
                icon={MessageSquare}
                title="Messages"
                description="Talk to property owners"
                href="/messages"
              />

              <QuickAction
                icon={FileText}
                title="My Bookings"
                description="Manage your visit requests"
                href="/bookings"
              />
            </div>
          </div>
        </section>

        {/* PROFILE CTA */}
        <section className="mt-8 pb-4">
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-bold">Complete your profile</h2>
                    <p className="text-sm text-muted-foreground">
                      Keep your renter information up to date.
                    </p>
                  </div>
                </div>
              </div>

              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/profile">
                  Open Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Page>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>

      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-border hover:bg-muted/50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
    </Link>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}
