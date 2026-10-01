import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      {
        title: "Log in — Room Renter",
      },
      {
        name: "description",
        content: "Log in to Room Renter as a room seeker or property owner.",
      },
      {
        property: "og:title",
        content: "Log in — Room Renter",
      },
      {
        property: "og:description",
        content: "Log in to your Room Renter account.",
      },
    ],
  }),
  component: LoginPage,
});

type LocalRole = "seeker" | "owner";

export function RoleSwitch({
  role,
  onChange,
}: {
  role: LocalRole;
  onChange: (role: LocalRole) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
      <button
        type="button"
        onClick={() => onChange("seeker")}
        className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
          role === "seeker"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Room Seeker
      </button>

      <button
        type="button"
        onClick={() => onChange("owner")}
        className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
          role === "owner"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Property Owner
      </button>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { setRole } = useApp();

  const [role, setLocalRole] = useState<LocalRole>("seeker");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /*
   * -------------------------------------------------------
   * REDIRECT USER AFTER AUTHENTICATION
   * -------------------------------------------------------
   */
  const redirectUser = (userRole: "renter" | "landlord") => {
    setRole(userRole);

    if (userRole === "landlord") {
      navigate({
        to: "/landlord",
      });
    } else {
      navigate({
        to: "/search",
        search: {
          city: "Lucknow",
          type: undefined,
          budget: undefined,
        },
      });
    }
  };

  /*
   * -------------------------------------------------------
   * HANDLE GOOGLE AUTH CALLBACK
   *
   * Google redirects back to /login.
   *
   * signup intent:
   *   Use the role selected on signup.
   *
   * login intent:
   *   Use the role already stored in profiles.
   * -------------------------------------------------------
   */
  useEffect(() => {
    let mounted = true;

    const handleGoogleUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted || !session?.user) {
          return;
        }

        /*
         * Check whether this Google authentication started
         * from the signup page or login page.
         */
        const intent = localStorage.getItem("google_auth_intent");
        const pendingRole = localStorage.getItem("pending_google_role");

        /*
         * ---------------------------------------------------
         * GOOGLE SIGNUP
         * ---------------------------------------------------
         *
         * This is important because Supabase may create a
         * profile through a database trigger with the default
         * role "renter".
         *
         * We explicitly overwrite that profile with the role
         * selected during signup.
         */
        if (intent === "signup" && (pendingRole === "landlord" || pendingRole === "renter")) {
          const googleRole = pendingRole === "landlord" ? "landlord" : "renter";

          const fullName =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split("@")[0] ||
            "Room Renter";

          const phone = session.user.user_metadata?.phone || "";

          const { error: profileError } = await supabase.from("profiles").upsert(
            {
              id: session.user.id,
              role: googleRole,
              full_name: fullName,
              phone,
            },
            {
              onConflict: "id",
            },
          );

          if (profileError) {
            console.error("Google signup profile error:", profileError);

            toast.error(profileError.message);
            return;
          }

          /*
           * Clear temporary Google signup information.
           */
          localStorage.removeItem("pending_google_role");
          localStorage.removeItem("google_auth_intent");

          toast.success(
            googleRole === "landlord"
              ? "Landlord account created successfully!"
              : "Room seeker account created successfully!",
          );

          redirectUser(googleRole);

          return;
        }

        /*
         * ---------------------------------------------------
         * NORMAL GOOGLE LOGIN
         * ---------------------------------------------------
         */
        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name, phone")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile fetch error:", profileError);

          toast.error(profileError.message);
          return;
        }

        /*
         * Existing profile found.
         */
        if (existingProfile) {
          const existingRole = existingProfile.role;

          if (existingRole !== "renter" && existingRole !== "landlord") {
            console.error("Invalid profile role:", existingRole);

            toast.error("Your account has an invalid role. Please contact support.");

            return;
          }

          localStorage.removeItem("pending_google_role");
          localStorage.removeItem("google_auth_intent");

          redirectUser(existingRole);

          return;
        }

        /*
         * ---------------------------------------------------
         * FALLBACK
         * ---------------------------------------------------
         *
         * If no profile exists for some reason, create one.
         */
        const fallbackRole = pendingRole === "landlord" ? "landlord" : "renter";

        const fullName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "Room Renter";

        const phone = session.user.user_metadata?.phone || "";

        const { error: insertError } = await supabase.from("profiles").insert({
          id: session.user.id,
          role: fallbackRole,
          full_name: fullName,
          phone,
        });

        if (insertError) {
          console.error("Profile creation error:", insertError);

          toast.error(insertError.message);
          return;
        }

        localStorage.removeItem("pending_google_role");
        localStorage.removeItem("google_auth_intent");

        redirectUser(fallbackRole);
      } catch (error) {
        console.error("Google authentication error:", error);

        toast.error("Something went wrong during Google authentication.");
      }
    };

    handleGoogleUser();

    return () => {
      mounted = false;
    };
  }, [navigate, setRole]);

  /*
   * -------------------------------------------------------
   * EMAIL / PASSWORD LOGIN
   * -------------------------------------------------------
   */
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }

    if (!password) {
      toast.error("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Login error:", error);
        toast.error(error.message);
        return;
      }

      if (!data.user) {
        toast.error("Unable to log in.");
        return;
      }

      /*
       * Get actual role from profiles table.
       */
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);

        toast.error(profileError.message);
        return;
      }

      if (!profile) {
        toast.error("Profile not found. Please complete your signup.");
        return;
      }

      if (profile.role !== "renter" && profile.role !== "landlord") {
        toast.error("Invalid account role.");
        return;
      }

      localStorage.removeItem("pending_google_role");
      localStorage.removeItem("google_auth_intent");

      toast.success("Logged in successfully!");

      redirectUser(profile.role);
    } catch (error) {
      console.error("Unexpected login error:", error);

      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * -------------------------------------------------------
   * GOOGLE LOGIN
   * -------------------------------------------------------
   */
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      /*
       * Tell the callback that this is LOGIN,
       * not SIGNUP.
       */
      localStorage.removeItem("pending_google_role");
      localStorage.setItem("google_auth_intent", "login");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        console.error("Google login error:", error);

        localStorage.removeItem("google_auth_intent");

        toast.error(error.message);
      }
    } catch (error) {
      console.error("Unexpected Google login error:", error);

      localStorage.removeItem("google_auth_intent");

      toast.error("Unable to continue with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Page footer={false}>
      <div className="container-page flex justify-center py-12 sm:py-16">
        <div className="card-surface w-full max-w-md p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Log in to continue to Room Renter.
            </p>
          </div>

          <div className="mt-6">
            <RoleSwitch role={role} onChange={setLocalRole} />
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>

                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={async () => {
                    if (!email.trim()) {
                      toast.error("Enter your email first.");
                      return;
                    }

                    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                      redirectTo: `${window.location.origin}/login`,
                    });

                    if (error) {
                      toast.error(error.message);
                      return;
                    }

                    toast.success("Password reset email sent.");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="rounded-xl pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl"
              disabled={loading || googleLoading}
            >
              <ShieldCheck className="h-4 w-4" />

              {loading
                ? "Logging in..."
                : role === "owner"
                  ? "Log in as Property Owner"
                  : "Log in as Room Seeker"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />

            <span className="text-xs text-muted-foreground">OR</span>

            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full rounded-xl"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.94 2.92v2.43h3.14c1.84-1.69 2.93-4.18 2.93-7.38Z"
              />
              <path
                fill="#34A853"
                d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.43c-.87.58-1.98.93-3.31.93-2.55 0-4.71-1.72-5.49-4.03H3.26v2.51A9.75 9.75 0 0 0 12 21.5Z"
              />
              <path
                fill="#FBBC05"
                d="M6.51 13.62A5.86 5.86 0 0 1 6.2 12c0-.56.1-1.1.31-1.62V7.87H3.26A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.01 4.13l3.25-2.51Z"
              />
              <path
                fill="#EA4335"
                d="M12 6.35c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.4 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.74 5.37l3.25 2.51c.78-2.31 2.94-4.03 5.49-4.03Z"
              />
            </svg>

            {googleLoading ? "Connecting to Google..." : "Continue with Google"}
          </Button>

          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex gap-3">
              <div className="mt-0.5">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>

              <div>
                <p className="text-sm font-semibold">Secure authentication</p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Your account role is stored securely and determines which dashboard you can
                  access.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Create one
            </Link>
          </p>

          <Link
            to="/"
            className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Back to home
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Page>
  );
}
