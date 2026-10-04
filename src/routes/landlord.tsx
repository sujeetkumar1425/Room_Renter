import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Eye,
  MapPin,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useEffect, useState, type ComponentType } from "react";

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

  room_type?: string | null;

  furnished?: string | boolean | null;

  bedrooms?: number | null;

  bathrooms?: number | null;

  amenities?: string[] | null;

  images?: string[] | null;
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
  /* =========================================================

     ROUTE PROTECTION

  ========================================================= */

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

    if (profile?.role !== "landlord") {
      throw redirect({
        to: "/dashboard",
      });
    }
  },

  /* =========================================================

     PAGE META

  ========================================================= */

  head: () => ({
    meta: [
      {
        title: "Landlord Dashboard — Room Renter",
      },

      {
        name: "description",

        content: "Manage your properties, enquiries, bookings and tenants.",
      },
    ],
  }),

  component: LandlordDashboard,
});

/* =========================================================

   LANDLORD DASHBOARD

========================================================= */

function LandlordDashboard() {
  const { user } = useApp();

  /* =========================================================

     STATE

  ========================================================= */

  const [profileName, setProfileName] = useState("");

  const [properties, setProperties] = useState<LandlordProperty[]>([]);

  const [propertyCount, setPropertyCount] = useState(0);

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loadingBookings, setLoadingBookings] = useState(true);

  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  /* =========================================================

     LOAD LANDLORD PROFILE NAME



     IMPORTANT:

     The real name comes from profiles.full_name.

  ========================================================= */

  const loadProfile = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return;
    }

    const { data: profile, error } = await supabase

      .from("profiles")

      .select("full_name")

      .eq("id", currentUser.id)

      .single();

    if (error) {
      console.error(
        "Error loading landlord profile:",

        error,
      );

      return;
    }

    setProfileName(profile?.full_name?.trim() || "");
  };

  /* =========================================================

     LOAD PROPERTIES + BOOKINGS

  ========================================================= */

  const loadDashboard = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return;
    }

    const [
      {
        data: propertyData,

        error: propertyError,

        count,
      },

      {
        data: bookingData,

        error: bookingError,
      },
    ] = await Promise.all([
      /* -----------------------------------------------------

         LANDLORD PROPERTIES

      ----------------------------------------------------- */

      supabase

        .from("properties")

        .select(
          "id,title,city,address,rent,available,room_type,furnished,bedrooms,bathrooms,amenities,images",

          {
            count: "exact",
          },
        )

        .eq(
          "landlord_id",

          currentUser.id,
        )

        .order("id", {
          ascending: false,
        }),

      /* -----------------------------------------------------

         BOOKING REQUESTS

      ----------------------------------------------------- */

      supabase

        .from("bookings")

        .select("id,property_id,renter_id,visit_date,visit_time,status,notes")

        .eq(
          "landlord_id",

          currentUser.id,
        )

        .order("visit_date", {
          ascending: true,
        })

        .order("visit_time", {
          ascending: true,
        }),
    ]);

    /* -------------------------------------------------------

       PROPERTIES RESULT

    ------------------------------------------------------- */

    if (propertyError) {
      console.error(
        "Error loading properties:",

        propertyError,
      );

      toast.error("Could not load your properties.");
    } else {
      setProperties((propertyData ?? []) as LandlordProperty[]);

      setPropertyCount(count ?? 0);
    }

    /* -------------------------------------------------------

       BOOKINGS RESULT

    ------------------------------------------------------- */

    if (bookingError) {
      console.error(
        "Error loading bookings:",

        bookingError,
      );

      toast.error("Could not load booking requests.");

      setBookings([]);
    } else {
      setBookings((bookingData ?? []) as Booking[]);
    }

    setLoadingBookings(false);
  };

  /* =========================================================

     INITIAL LOAD + REALTIME BOOKINGS

  ========================================================= */

  useEffect(() => {
    void loadProfile();

    void loadDashboard();

    const channel = supabase

      .channel("landlord-bookings-dashboard")

      .on(
        "postgres_changes",

        {
          event: "*",

          schema: "public",

          table: "bookings",
        },

        () => {
          void loadDashboard();
        },
      )

      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  /* =========================================================

     DELETE PROPERTY

  ========================================================= */

  const deleteProperty = async (property: LandlordProperty) => {
    if (deletingId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${property.title || "this property"}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(property.id);

    const { error } = await supabase

      .from("properties")

      .delete()

      .eq(
        "id",

        Number(property.id),
      );

    if (error) {
      console.error(
        "Delete property error:",

        error,
      );

      toast.error(error.message || "Could not delete the property.");

      setDeletingId(null);

      return;
    }

    setProperties((current) => current.filter((item) => item.id !== property.id));

    setPropertyCount((current) => Math.max(0, current - 1));

    toast.success("Property deleted.");

    setDeletingId(null);
  };

  /* =========================================================

     UPDATE BOOKING STATUS

  ========================================================= */

  const updateBookingStatus = async (
    bookingId: number,

    status: "approved" | "rejected",
  ) => {
    const { error } = await supabase

      .from("bookings")

      .update({
        status,
      })

      .eq(
        "id",

        bookingId,
      );

    if (error) {
      console.error(
        "Booking status error:",

        error,
      );

      toast.error(error.message || "Could not update booking.");

      return;
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,

              status,
            }
          : booking,
      ),
    );

    toast.success(status === "approved" ? "Booking approved." : "Booking rejected.");
  };

  /* =========================================================

     HELPERS

  ========================================================= */

  const propertyTitle = (propertyId: number) =>
    properties.find((property) => Number(property.id) === Number(propertyId))?.title ||
    `Property #${propertyId}`;

  /*

    REAL LANDLORD NAME



    Priority:

    1. profiles.full_name

    2. Supabase auth full_name

    3. email username

    4. Landlord

  */

  const name =
    profileName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Landlord";

  const pendingBookings = bookings.filter((booking) => booking.status === "pending").length;

  /* =========================================================

     UI

  ========================================================= */

  return (
    <Page>
      <div className="container-page pb-24 pt-6 sm:py-12">
        {/* =================================================

            WELCOME HEADER

        ================================================= */}

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Property Owner</p>

            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome, {name} 👋
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Manage your properties, enquiries and bookings.
            </p>
          </div>
        </div>

        {/* =================================================

            STATS

        ================================================= */}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
          <StatCard
            icon={Building2}

            title="My Properties"

            value={String(propertyCount)}

            description="Properties listed"
          />

          <StatCard
            icon={MessageSquare}

            title="Enquiries"

            value="0"

            description="New enquiries"
          />

          <StatCard
            icon={CalendarDays}

            title="Bookings"

            value={String(bookings.length)}

            description={`${pendingBookings} pending requests`}
          />

          <StatCard
            icon={Users}

            title="Available"

            value={String(properties.filter((property) => property.available).length)}

            description="Properties available"
          />
        </div>

        {/* =================================================

            MY LISTED PROPERTIES

        ================================================= */}

        <section className="mt-10">
          {/* HEADER + SMALL PLUS BUTTON */}

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">My Listed Properties</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage the rooms and properties you have listed.
              </p>
            </div>

            <Button
              asChild

              size="icon"

              className="h-9 w-9 shrink-0 rounded-full"

              title="Add property"
            >
              <Link to="/list-property">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* PROPERTY LIST */}

          <div className="mt-4 space-y-3">
            {properties.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>

                <h3 className="mt-4 font-semibold">No properties yet</h3>

                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Add your first room or property and start receiving enquiries from renters.
                </p>

                <Button
                  asChild

                  className="mt-5 rounded-xl"
                >
                  <Link to="/list-property">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Link>
                </Button>
              </div>
            ) : (
              properties.map((property) => {
                const image = property.images?.[0];

                return (
                  <div
                    key={property.id}

                    className="flex min-h-[105px] items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4 sm:p-4"
                  >
                    {/* PROPERTY IMAGE */}

                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-28">
                      {image ? (
                        <img
                          src={image}

                          alt={property.title || "Property"}

                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Building2 className="h-7 w-7 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* PROPERTY INFO */}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <h3 className="truncate text-sm font-semibold sm:text-base">
                          {property.title || "Untitled property"}
                        </h3>

                        {property.available ? (
                          <span className="hidden shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:inline-flex">
                            Available
                          </span>
                        ) : (
                          <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
                            Unavailable
                          </span>
                        )}
                      </div>

                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />

                        {property.city || "Location not specified"}
                      </p>

                      {/* TAGS */}

                      <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
                        {property.room_type ? (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {formatRoomType(property.room_type)}
                          </span>
                        ) : null}

                        {property.furnished ? (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {formatFurnished(property.furnished)}
                          </span>
                        ) : null}

                        {property.bedrooms ? (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {property.bedrooms} {property.bedrooms === 1 ? "Bedroom" : "Bedrooms"}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-bold">
                          ₹{Number(property.rent || 0).toLocaleString("en-IN")}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            /month
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* MOBILE STATUS */}

                    <div className="self-start sm:hidden">
                      <span
                        className={
                          property.available
                            ? "rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-600"
                            : "rounded-full bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground"
                        }
                      >
                        {property.available ? "Available" : "Unavailable"}
                      </span>
                    </div>

                    {/* THREE DOT MENU */}

                    <details className="relative self-start">
                      <summary
                        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden"

                        title="Property actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </summary>

                      <div className="absolute right-0 top-9 z-30 w-36 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg">
                        {/* VIEW */}

                        <Link
                          to="/property/$id"

                          params={{
                            id: String(property.id),
                          }}

                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>

                        {/* EDIT */}

                        <Link
                          to="/edit-property"

                          search={{
                            id: String(property.id),
                          }}

                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>

                        {/* DELETE */}

                        <button
                          type="button"

                          disabled={deletingId === property.id}

                          onClick={() => void deleteProperty(property)}

                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />

                          {deletingId === property.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </details>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* =================================================

            BOOKING REQUESTS

        ================================================= */}

        <section className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Booking Requests</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Recent booking requests from renters.
              </p>
            </div>

            <Button
              asChild

              variant="outline"

              className="w-fit rounded-xl"
            >
              <Link to="/bookings">
                View all bookings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {loadingBookings ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading booking requests...
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>

                <h3 className="mt-3 font-semibold">No booking requests</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  New requests from renters will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {bookings

                  .slice(0, 8)

                  .map((booking) => (
                    <div
                      key={booking.id}

                      className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* BOOKING INFO */}

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                          {booking.renter_id

                            .slice(0, 1)

                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {propertyTitle(booking.property_id)}
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatBookingDate(booking.visit_date)} ·{" "}
                            {formatBookingTime(booking.visit_time)}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Renter:{" "}
                            {booking.renter_id.slice(
                              0,

                              8,
                            )}
                            …
                          </p>

                          {booking.notes ? (
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {booking.notes}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* STATUS + ACTIONS */}

                      <div className="flex flex-wrap items-center gap-2">
                        <BookingBadge status={booking.status} />

                        {booking.status === "pending" ? (
                          <>
                            <Button
                              size="sm"

                              className="rounded-lg"

                              onClick={() =>
                                void updateBookingStatus(
                                  booking.id,

                                  "approved",
                                )
                              }
                            >
                              <Check className="mr-1.5 h-4 w-4" />
                              Approve
                            </Button>

                            <Button
                              size="sm"

                              variant="outline"

                              className="rounded-lg text-destructive hover:text-destructive"

                              onClick={() =>
                                void updateBookingStatus(
                                  booking.id,

                                  "rejected",
                                )
                              }
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

        {/* =================================================

            QUICK ACTIONS

        ================================================= */}

        <section className="mt-8 hidden lg:block">
          <h2 className="text-xl font-bold">Quick Actions</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* VIEW ENQUIRIES */}

            <ActionCard
              icon={MessageSquare}

              title="View Enquiries"

              description="Respond to renter enquiries."

              href="/messages"
            />

            {/* BOOKING REQUESTS */}

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

/* =========================================================

   ROOM TYPE FORMATTER

========================================================= */

function formatRoomType(value: string) {
  return value

    .replace(/_/g, " ")

    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/* =========================================================

   FURNISHED FORMATTER

========================================================= */

function formatFurnished(value: string | boolean) {
  if (typeof value === "boolean") {
    return value ? "Furnished" : "Unfurnished";
  }

  return value

    .replace(/_/g, " ")

    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/* =========================================================

   BOOKING DATE

========================================================= */

function formatBookingDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(
        "en-IN",

        {
          day: "numeric",

          month: "short",

          year: "numeric",
        },
      );
}

/* =========================================================

   BOOKING TIME

========================================================= */

function formatBookingTime(value: string) {
  const [hours, minutes] = value

    .split(":")

    .map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const date = new Date();

  date.setHours(
    hours,

    minutes,

    0,

    0,
  );

  return date.toLocaleTimeString(
    "en-IN",

    {
      hour: "numeric",

      minute: "2-digit",
    },
  );
}

/* =========================================================

   BOOKING BADGE

========================================================= */

function BookingBadge({ status }: { status: string }) {
  const classes =
    status === "approved"
      ? "bg-emerald-500/10 text-emerald-600"
      : status === "rejected" || status === "cancelled"
        ? "bg-destructive/10 text-destructive"
        : "bg-amber-500/10 text-amber-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes}`}>
      {status}
    </span>
  );
}

/* =========================================================

   STAT CARD

========================================================= */

function StatCard({
  icon: Icon,

  title,

  value,

  description,
}: {
  icon: ComponentType<{
    className?: string;
  }>;

  title: string;

  value: string;

  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <span className="text-xl font-bold sm:text-2xl">{value}</span>
      </div>

      <h3 className="mt-4 font-semibold">{title}</h3>

      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
    </div>
  );
}

/* =========================================================

   QUICK ACTION CARD

========================================================= */

function ActionCard({
  icon: Icon,

  title,

  description,

  href,
}: {
  icon: ComponentType<{
    className?: string;
  }>;

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
