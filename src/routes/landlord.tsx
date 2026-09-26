import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Building2,
  Plus,
  MessageSquare,
  CalendarDays,
  Users,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/landlord")({
  // ============================================
  // ROUTE PROTECTION
  // ============================================
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Not logged in → login
    if (!session) {
      throw redirect({
        to: "/login",
      });
    }

    // Check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    // Only landlords can access this page
    if (profile?.role !== "landlord") {
      throw redirect({
        to: "/dashboard",
      });
    }
  },

  head: () => ({
    meta: [
      {
        title: "Landlord Dashboard — Room Renter",
      },
      {
        name: "description",
        content:
          "Manage your properties, enquiries, bookings and tenants.",
      },
    ],
  }),

  component: LandlordDashboard,
});

function LandlordDashboard() {
  const { user } = useApp();

  const [propertyCount, setPropertyCount] = useState(0);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ============================================
  // LOAD LANDLORD PROPERTIES
  // ============================================
  useEffect(() => {
    const loadProperties = async () => {
      setLoading(true);

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        console.log("No authenticated user found");
        setLoading(false);
        return;
      }

      console.log("Current landlord ID:", currentUser.id);

      const { data, error, count } = await supabase
        .from("properties")
        .select("*", { count: "exact" })
        .eq("landlord_id", currentUser.id);

      console.log("Properties:", data);
      console.log("Property count:", count);
      console.log("Property error:", error);

      if (error) {
        console.error("Error loading properties:", error);
        toast.error("Unable to load your properties.");
        setLoading(false);
        return;
      }

      setProperties(data ?? []);
      setPropertyCount(count ?? 0);
      setLoading(false);
    };

    loadProperties();
  }, []);

  // ============================================
  // DELETE PROPERTY
  // ============================================
  const deleteProperty = async (propertyId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this property?\n\nThis action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(propertyId);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      toast.error("You must be logged in.");
      setDeletingId(null);
      return;
    }

    // Delete only a property belonging to the logged-in landlord
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId)
      .eq("landlord_id", currentUser.id);

    if (error) {
      console.error("Delete property error:", error);
      toast.error(error.message || "Failed to delete property.");
      setDeletingId(null);
      return;
    }

    // Remove it immediately from the screen
    setProperties((currentProperties) =>
      currentProperties.filter(
        (property) => property.id !== propertyId,
      ),
    );

    setPropertyCount((currentCount) =>
      Math.max(0, currentCount - 1),
    );

    toast.success("Property deleted successfully.");

    setDeletingId(null);
  };

  const name =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Landlord";

  return (
    <Page>
      <div className="container-page py-8 sm:py-12">

        {/* ============================================
            HEADER
        ============================================ */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Property Owner
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Welcome, {name} 👋
            </h1>

            <p className="mt-2 text-muted-foreground">
              Manage your properties, enquiries and bookings.
            </p>
          </div>

          <Button
            asChild
            className="rounded-xl"
          >
            <Link to="/list-property">
              <Plus className="mr-2 h-4 w-4" />
              List a Property
            </Link>
          </Button>
        </div>

        {/* ============================================
            STATS
        ============================================ */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

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
            value="0"
            description="Booking requests"
          />

          <StatCard
            icon={Users}
            title="Tenants"
            value="0"
            description="Active tenants"
          />

        </div>

        {/* ============================================
            MY PROPERTIES
        ============================================ */}
        <section className="mt-10">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                My Properties
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage the rooms and properties you have listed.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            {/* LOADING */}
            {loading ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Loading your properties...
                </p>
              </div>
            ) : properties.length === 0 ? (

              /* ============================================
                 NO PROPERTIES
              ============================================ */
              <div className="rounded-2xl border border-border bg-card p-8 text-center sm:col-span-2">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>

                <h3 className="mt-4 font-semibold">
                  No properties yet
                </h3>

                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  List your first room or property and start receiving
                  enquiries from renters.
                </p>

                <Button
                  asChild
                  className="mt-5 rounded-xl"
                >
                  <Link to="/list-property">
                    <Plus className="mr-2 h-4 w-4" />
                    List Your Property
                  </Link>
                </Button>

              </div>

            ) : (

              /* ============================================
                 PROPERTY LIST
              ============================================ */
              properties.map((property) => (

                <div
                  key={property.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >

                  {/* PROPERTY HEADER */}
                  <div className="flex items-start justify-between gap-4">

                    <div className="min-w-0">

                      <h3 className="font-semibold">
                        {property.title}
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {property.city}
                      </p>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {property.address}
                      </p>

                    </div>

                    <Building2 className="h-5 w-5 shrink-0 text-primary" />

                  </div>

                  {/* PRICE + STATUS */}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">

                    <span className="font-semibold">
                      ₹{Number(property.rent).toLocaleString("en-IN")}/month
                    </span>

                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {property.available
                        ? "Available"
                        : "Unavailable"}
                    </span>

                  </div>

                  {/* DELETE BUTTON */}
                  <div className="mt-4 border-t border-border pt-4">

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deletingId === property.id}
                      onClick={() => deleteProperty(property.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />

                      {deletingId === property.id
                        ? "Deleting..."
                        : "Delete Property"}
                    </Button>

                  </div>

                </div>

              ))
            )}

          </div>

        </section>

        {/* ============================================
            QUICK ACTIONS
        ============================================ */}
        <section className="mt-8">

          <h2 className="text-xl font-bold">
            Quick Actions
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

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

/* ================================================
   STAT CARD
================================================ */

function StatCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">

      <div className="flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <span className="text-2xl font-bold">
          {value}
        </span>

      </div>

      <h3 className="mt-4 font-semibold">
        {title}
      </h3>

      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>

    </div>
  );
}

/* ================================================
   ACTION CARD
================================================ */

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
      className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
    >

      <div className="flex items-start justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />

      </div>

      <h3 className="mt-4 font-semibold">
        {title}
      </h3>

      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>

    </Link>
  );
}