import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Home, Building2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Room Renter" },
      {
        name: "description",
        content:
          "Log in to Room Renter as a room seeker or as a property owner.",
      },
      {
        property: "og:title",
        content: "Login — Room Renter",
      },
      {
        property: "og:description",
        content:
          "Separate logins for room seekers and property owners.",
      },
    ],
  }),

  component: LoginPage,
});

// ---------------------------------------------
// ROLE CARDS
// ---------------------------------------------

export const roleCards = [
  {
    key: "seeker" as const,
    icon: Home,
    title: "Room Seeker",
    text: "Find and book verified rooms",
  },
  {
    key: "owner" as const,
    icon: Building2,
    title: "Property Owner",
    text: "List rooms and manage enquiries",
  },
];

// ---------------------------------------------
// ROLE SWITCH
// ---------------------------------------------

export function RoleSwitch({
  role,
  onChange,
}: {
  role: "seeker" | "owner";
  onChange: (r: "seeker" | "owner") => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {roleCards.map((r) => {
        const Icon = r.icon;

        return (
          <button
            key={r.key}
            type="button"
            onClick={() => onChange(r.key)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all",
              role === r.key
                ? "border-primary bg-accent shadow-[var(--shadow-soft)]"
                : "border-border hover:bg-muted",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                role === r.key
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            />

            <p className="mt-2 font-semibold">
              {r.title}
            </p>

            <p className="text-xs text-muted-foreground">
              {r.text}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------
// LOGIN PAGE
// ---------------------------------------------

function LoginPage() {
  const navigate = useNavigate();
  //const { setRole } = useApp();

  const [role, setLocalRole] =
    useState<"seeker" | "owner">("seeker");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // -------------------------------------------
  // LOGIN
  // -------------------------------------------

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    try {
      setLoading(true);

      // -----------------------------------------
      // 1. LOGIN WITH SUPABASE AUTH
      // -----------------------------------------

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // Login failed
      if (authError) {
        console.error("Supabase login error:", authError);

        toast.error(authError.message);

        return;
      }

      // No user returned
      if (!authData.user) {
        toast.error("Login failed. Please try again.");

        return;
      }

      // -----------------------------------------
      // 2. GET USER PROFILE
      // -----------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", authData.user.id)
        .single();

      // Profile not found
      if (profileError || !profile) {
        console.error(
          "Profile error:",
          profileError,
        );

        toast.error(
          "Your account profile could not be found.",
        );

        // Sign out because profile is missing
        await supabase.auth.signOut();

        return;
      }

      // -----------------------------------------
      // 3. CHECK ROLE
      // -----------------------------------------

      // const userRole =
      //   profile.role === "landlord"
      //     ? "owner"
      //     : "seeker";

      // // Save role to your existing app context
      // setRole(userRole);

      // -----------------------------------------
      // 4. SUCCESS
      // -----------------------------------------

      toast.success(
        `Welcome back${
          profile.full_name
            ? `, ${profile.full_name}`
            : ""
        }!`,
      );

      // -----------------------------------------
      // 5. REDIRECT
      // -----------------------------------------

      if (profile.role === "landlord") {
  navigate({
    to: "/landlord",
  });
} else {
  navigate({
    to: "/search",
    search: {
      city: "Lucknow",
    },
  });
}
    } catch (error: any) {
  console.error("LOGIN ERROR:", error);

  toast.error(
    error?.message || "Something went wrong. Check the browser console."
  );
} finally {
      setLoading(false);
    }
  };

  // -------------------------------------------
  // UI
  // -------------------------------------------

  return (
    <Page footer={false}>
      <div className="container-page flex justify-center py-12 sm:py-16">
        <div className="card-surface w-full max-w-md p-6 sm:p-8">

          {/* HEADER */}
          <h1 className="text-2xl font-bold">
            Log in to Room Renter
          </h1>

          <p className="mt-1.5 text-sm text-muted-foreground">
            Choose how you want to continue.
          </p>

          {/* ROLE SELECTION */}
          <div className="mt-5">
            <RoleSwitch
              role={role}
              onChange={setLocalRole}
            />
          </div>

          {/* LOGIN FORM */}
          <form
            onSubmit={submit}
            className="mt-6 space-y-4"
          >

            {/* EMAIL */}
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email
              </Label>

              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  className="rounded-xl pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="space-y-1.5">
              <Label htmlFor="pwd">
                Password
              </Label>

              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                <Input
                  id="pwd"
                  type="password"
                  required
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="••••••••"
                  className="rounded-xl pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl"
              disabled={loading}
            >
              <Mail className="h-4 w-4" />

              {loading
                ? "Logging in..."
                : `Continue as ${
                    role === "owner"
                      ? "Owner"
                      : "Room Seeker"
                  }`}
            </Button>
          </form>

          {/* SIGNUP */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to Room Renter?{" "}

            <Link
              to="/signup"
              className="font-semibold text-primary"
            >
              Create an account
            </Link>
          </p>

        </div>
      </div>
    </Page>
  );
}