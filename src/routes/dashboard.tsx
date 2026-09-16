import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Heart,
  MessageSquare,
  CalendarDays,
  FileText,
  Search,
  User,
  ArrowRight,
} from "lucide-react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  // ============================================
  // ROUTE PROTECTION
  // ============================================
  beforeLoad: async () => {
    // Check whether the user is logged in
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Not logged in → go to login
    if (!session) {
      throw redirect({
        to: "/login",
      });
    }

    // Get the user's role from Supabase
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    // Landlord → landlord dashboard
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
        content:
          "Manage your saved rooms, visits, messages and rental agreements.",
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

  const name =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <Page>
      <div className="container-page py-8 sm:py-12">

        {/* ============================================
            HEADER
        ============================================ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Room Seeker
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Welcome, {name} 👋
            </h1>

            <p className="mt-2 text-muted-foreground">
              Manage your rooms, bookings and rental activity.
            </p>
          </div>

          <Button asChild className="rounded-xl">
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              Find a Room
            </Link>
          </Button>
        </div>

        {/* ============================================
            QUICK ACTIONS
        ============================================ */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <DashboardCard
            icon={Heart}
            title="Saved Rooms"
            description="Rooms you saved"
            href="/saved"
          />

          <DashboardCard
            icon={CalendarDays}
            title="My Visits"
            description="Upcoming room visits"
            href="/visits"
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
            RECENT ACTIVITY
        ============================================ */}
        <section className="mt-10">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Recent Activity
              </h2>

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
              No activity yet
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Start exploring rooms and save the ones you like.
              Your bookings, visits and messages will appear here.
            </p>

            <Button
              asChild
              variant="outline"
              className="mt-5 rounded-xl"
            >
              <Link to="/search">
                Explore Rooms
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

          </div>

        </section>

        {/* ============================================
            PROFILE
        ============================================ */}
        <section className="mt-8">

          <div className="rounded-2xl border border-border bg-card p-6">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold">
                  Your Profile
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Keep your profile information up to date.
                </p>
              </div>

              <Button
                asChild
                variant="outline"
                className="rounded-xl"
              >
                <Link to="/profile">
                  View Profile
                </Link>
              </Button>

            </div>

          </div>

        </section>

      </div>
    </Page>
  );
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