import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Building2,
  Plus,
  MessageSquare,
  CalendarDays,
  Users,
  ArrowRight,
} from "lucide-react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/landlord")({
  // ============================================
  // ROUTE PROTECTION
  // ============================================
  beforeLoad: async () => {
    // Check if user is logged in
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Not logged in → send to login
    if (!session) {
      throw redirect({
        to: "/login",
      });
    }

    // Get user's role from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    // Renters should not access landlord dashboard
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
            value="0"
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

          <div className="mt-4 rounded-2xl border border-border bg-card p-8 text-center">

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