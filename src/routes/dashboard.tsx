import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Heart,
  MessageSquare,
  CalendarDays,
  FileText,
  Search,
  User,
  ArrowRight,
  Clock3,
  MapPin,
  CheckCircle2,
  Loader2,
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
  // ============================================
  // ROUTE PROTECTION
  // ============================================
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

  // ============================================
  // PAGE META
  // ============================================
  head: () => ({
    meta: [
      {
        title: "My Dashboard — Room Renter",
      },
      {
        name: "description",
        content: "Manage your saved rooms, visits, messages and rental agreements.",
      },
    ],
  }),

  component: DashboardPage,
});

// ================================================
// DASHBOARD PAGE
// ================================================

function DashboardPage() {
  const { user } = useApp();

  const [approvedBookings, setApprovedBookings] = useState<ApprovedBooking[]>([]);
  const [properties, setProperties] = useState<PropertyLookup[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // ============================================
  // LOAD APPROVED BOOKINGS
  // ============================================

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

    // ============================================
    // LOAD PROPERTY DETAILS
    // ============================================

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

  // ============================================
  // INITIAL LOAD + REALTIME
  // ============================================

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

  // ============================================
  // PROPERTY LOOKUP
  // ============================================

  const propertyMap = new Map(properties.map((property) => [property.id, property]));

  return (
    <Page>
      <div className="container-page px-4 py-6 sm:px-6 sm:py-12">
        {/* ============================================
            HEADER
        ============================================ */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Room Seeker</p>

            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome, {name} 👋
            </h1>

            <p className="mt-2 text-muted-foreground">
              Manage your rooms, bookings and rental activity.
            </p>
          </div>

          <Button asChild className="w-full rounded-xl sm:w-auto">
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

        {/* ============================================
            QUICK ACTIONS
        ============================================ */}

        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <DashboardCard
            icon={Heart}
            title="Saved Rooms"
            description="Rooms you saved"
            href="/saved"
          />

          <DashboardCard
            icon={CalendarDays}
            title="My Visits"
            description={
              approvedBookings.length > 0
                ? `${approvedBookings.length} approved visit${
                    approvedBookings.length > 1 ? "s" : ""
                  }`
                : "Upcoming room visits"
            }
            href="/bookings"
          />

          <DashboardCard
            icon={MessageSquare}
            title="Messages"
            description="Chat with property owners"
            href="/messages"
          />

          <DashboardCard
            icon={FileText}
            title="Agreements"
            description="Your rental agreements"
            href="/agreement"
          />
        </div>

        {/* ============================================
            APPROVED VISITS
        ============================================ */}

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">Approved Visits</h2>

                {approvedBookings.length > 0 ? (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {approvedBookings.length}
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Your landlord-approved room visits.
              </p>
            </div>

            <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
              <Link to="/bookings">
                View all visits
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            {loadingBookings ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Checking your approved visits...
                </p>
              </div>
            ) : approvedBookings.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>

                <h3 className="mt-4 font-semibold">No approved visits yet</h3>

                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  When a landlord approves your visit request, it will appear here automatically.
                </p>

                <Button asChild variant="outline" className="mt-5 rounded-xl">
                  <Link
                    to="/search"
                    search={{
                      city: undefined,
                      type: undefined,
                      budget: undefined,
                    }}
                  >
                    Explore Rooms
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              approvedBookings.slice(0, 3).map((booking) => {
                const property = propertyMap.get(booking.property_id);

                return (
                  <article
                    key={booking.id}
                    className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm sm:p-5"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      {/* PROPERTY DETAILS */}

                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words font-semibold">
                                {property?.title || `Property #${booking.property_id}`}
                              </h3>

                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                <CheckCircle2 className="h-3 w-3" />
                                Approved
                              </span>
                            </div>

                            {property?.address ? (
                              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{property.address}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* DATE + TIME */}

                        <div className="mt-4 grid grid-cols-1 gap-2 xs:grid-cols-2 sm:flex sm:flex-wrap">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(booking.visit_date)}
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatTime(booking.visit_time)}
                          </span>
                        </div>

                        {booking.notes ? (
                          <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                            {booking.notes}
                          </p>
                        ) : null}
                      </div>

                      {/* ACTION */}

                      <div className="shrink-0">
                        <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                          <Link to="/bookings">
                            View Visit
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* ============================================
            RECENT ACTIVITY
        ============================================ */}

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Recent Activity</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your latest rental activity will appear here.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>

            <h3 className="mt-4 font-semibold">
              {approvedBookings.length > 0 ? "You're all set!" : "No activity yet"}
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {approvedBookings.length > 0
                ? "Your approved room visits are shown above. You can view all your bookings from My Visits."
                : "Start exploring rooms and save the ones you like. Your bookings, visits and messages will appear here."}
            </p>

            <Button asChild variant="outline" className="mt-5 rounded-xl">
              <Link
                to={approvedBookings.length > 0 ? "/bookings" : "/search"}
                search={
                  approvedBookings.length > 0
                    ? undefined
                    : {
                        city: undefined,
                        type: undefined,
                        budget: undefined,
                      }
                }
              >
                {approvedBookings.length > 0 ? "View My Visits" : "Explore Rooms"}

                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* ============================================
            PROFILE
        ============================================ */}

        <section className="mt-8 pb-4 sm:pb-0">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold">Your Profile</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Keep your profile information up to date.
                </p>
              </div>

              <Button variant="outline" className="w-full rounded-xl sm:w-auto" disabled>
                Profile settings coming soon
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Page>
  );
}

// ================================================
// DATE FORMATTER
// ================================================

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

// ================================================
// TIME FORMATTER
// ================================================

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

// ================================================
// DASHBOARD CARD
// ================================================

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
      className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      <h3 className="mt-4 font-semibold">{title}</h3>

      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
