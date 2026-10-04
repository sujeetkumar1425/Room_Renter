import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { RoleSwitch } from "./login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Room Renter" },
      {
        name: "description",
        content: "Create a Room Renter account as a room seeker or property owner.",
      },
      {
        property: "og:title",
        content: "Sign up — Room Renter",
      },
      {
        property: "og:description",
        content: "Separate sign up for room seekers and property owners.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();

  const [role, setLocalRole] = useState<"seeker" | "owner">("seeker");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const continueWithGoogle = async () => {
    try {
      setGoogleLoading(true);

      const googleRole = role === "owner" ? "landlord" : "renter";

      localStorage.setItem("pending_google_role", googleRole);
      localStorage.setItem("google_auth_intent", "signup");

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
        localStorage.removeItem("pending_google_role");
        localStorage.removeItem("google_auth_intent");
        toast.error(error.message);
        setGoogleLoading(false);
      }
    } catch (error) {
      console.error(error);

      localStorage.removeItem("pending_google_role");
      localStorage.removeItem("google_auth_intent");

      toast.error("Unable to continue with Google.");
      setGoogleLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);

      const selectedRole = role === "owner" ? "landlord" : "renter";

      // Keep the selected role available if email confirmation is enabled
      // and Supabase creates the profile through a trigger with a default role.
      localStorage.setItem("pending_email_role", selectedRole);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone,
            role: selectedRole,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (!data.user) {
        localStorage.removeItem("pending_email_role");
        toast.error("Unable to create account");
        return;
      }

      // If Supabase returned a session, make the selected role explicit in
      // profiles immediately. This prevents a trigger/default "renter" role.
      if (data.session) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            role: selectedRole,
            full_name: name.trim(),
            phone: phone.trim(),
          },
          { onConflict: "id" },
        );

        if (profileError) {
          console.error("Signup profile error:", profileError);
          toast.error(profileError.message);
          return;
        }

        localStorage.removeItem("pending_email_role");

        toast.success("Account created successfully!");

        navigate({
          to: selectedRole === "landlord" ? "/list-property" : "/",
        });
      } else {
        // Email confirmation is enabled. Keep the role until the user logs in.
        toast.success("Account created! Please verify your email and log in.");
        navigate({ to: "/login" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page footer={false}>
      <div className="container-page flex min-h-[calc(100dvh-5rem)] items-start justify-center px-4 py-6 sm:items-center sm:py-12">
        <div className="card-surface w-full max-w-md p-5 sm:p-8">
          <h1 className="text-xl font-bold sm:text-2xl">Create your account</h1>

          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
            Room seekers and property owners get their own space.
          </p>

          <div className="mt-5">
            <RoleSwitch role={role} onChange={setLocalRole} />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-5 min-h-11 w-full rounded-xl"
            onClick={continueWithGoogle}
            disabled={googleLoading || loading}
          >
            <span className="flex h-5 w-5 items-center justify-center font-bold text-base">G</span>
            {googleLoading ? "Connecting to Google..." : "Continue with Google"}
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="shrink-0 text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sujeet Kumar"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ph">Phone number</Label>
              <Input
                id="ph"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98XXXXXX21"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="h-11 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="min-h-11 w-full rounded-xl"
              disabled={loading || googleLoading}
            >
              <ShieldCheck className="h-4 w-4" />
              {loading
                ? "Creating account..."
                : role === "owner"
                  ? "Create owner account"
                  : "Create seeker account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-primary">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
