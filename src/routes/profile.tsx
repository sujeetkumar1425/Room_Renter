import { createFileRoute, redirect } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Mail, Save, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/profile")({
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
        to: "/landlord-profile",
      });
    }
  },

  head: () => ({
    meta: [
      {
        title: "My Profile — Room Renter",
      },
    ],
  }),

  component: RenterProfilePage,
});

function RenterProfilePage() {
  const { user } = useApp();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setEmail(currentUser.email ?? "");

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        console.error("Load renter profile:", error);
      }

      setFullName(
        data?.full_name ||
          currentUser.user_metadata?.full_name ||
          currentUser.email?.split("@")[0] ||
          "",
      );

      setLoading(false);
    };

    void loadProfile();
  }, []);

  const handleSave = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) return;

    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setMessage("Please enter your name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: trimmedName,
      })
      .eq("id", currentUser.id);

    if (error) {
      console.error("Update renter profile:", error);
      setMessage("Unable to save your profile. Please try again.");
      setSaving(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
      },
    });

    setMessage("Profile updated successfully.");
    setSaving(false);
  };

  const displayName =
    fullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Renter";

  return (
    <Page>
      <div className="container-page px-4 py-6 sm:px-6 sm:py-10">
        {/* HEADER */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <User className="h-7 w-7" />
            </div>

            <div>
              <span className="text-sm font-semibold text-primary">Renter Profile</span>

              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {displayName}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage your personal information and account details.
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-6 rounded-3xl border border-border bg-card p-10 text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading your profile...</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* PROFILE FORM */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <h2 className="font-bold">Personal Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Update the information connected to your account.
                  </p>
                </div>
              </div>

              <div className="mt-7 space-y-5">
                <div>
                  <label htmlFor="full-name" className="mb-2 block text-sm font-semibold">
                    Full Name
                  </label>

                  <input
                    id="full-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your full name"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <input
                      id="email"
                      value={email}
                      disabled
                      className="h-11 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-3 text-sm text-muted-foreground"
                    />
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Your login email cannot be changed from this page.
                  </p>
                </div>

                {message ? (
                  <div
                    className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
                      message.includes("successfully")
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {message.includes("successfully") ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : null}
                    {message}
                  </div>
                ) : null}

                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="w-full rounded-xl sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </section>

            {/* ACCOUNT CARD */}
            <aside className="space-y-6">
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>

                <h2 className="mt-4 font-bold">Account Type</h2>

                <div className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  Room Seeker
                </div>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Your account is configured as a renter. You can search properties, save rooms,
                  request visits and communicate with landlords.
                </p>
              </section>

              <section className="rounded-3xl border border-border bg-card p-6">
                <h2 className="font-bold">Your Account</h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold text-primary">Active</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-semibold">Renter</span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </Page>
  );
}
