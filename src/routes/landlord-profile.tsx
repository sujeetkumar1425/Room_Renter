import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  AtSign,
  CheckCircle2,
  Home,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LandlordVerificationCard } from "@/components/LandlordVerificationCard";
import { Page } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string | null;
  phone: string | null;
  permanent_address: string | null;
  aadhaar_last4: string | null;
  aadhaar_verified: boolean;
};

export const Route = createFileRoute("/landlord-profile")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.role !== "landlord") {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Landlord Profile — Room Renter" },
      {
        name: "description",
        content: "Manage your personal information and landlord verification details.",
      },
    ],
  }),
  component: LandlordProfilePage,
});

function LandlordProfilePage() {
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    phone: "",
    permanent_address: "",
    aadhaar_last4: "",
    aadhaar_verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, permanent_address, aadhaar_last4, aadhaar_verified")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      setUserEmail(user.email ?? "");
      setEmailVerified(Boolean(user.email_confirmed_at));
      setProfile({
        full_name: data?.full_name ?? user.user_metadata?.full_name ?? "",
        phone: data?.phone ?? user.user_metadata?.phone ?? "",
        permanent_address: data?.permanent_address ?? "",
        aadhaar_last4: data?.aadhaar_last4 ?? "",
        aadhaar_verified: Boolean(data?.aadhaar_verified),
      });
      setLoading(false);
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const displayName = profile.full_name || "Landlord";
  const phoneVerified = Boolean(profile.phone);

  return (
    <Page>
      <div className="container-page py-6 sm:py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
            Account center
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your Profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage your personal information, identity verification, and account security.
          </p>
        </div>

        {loading ? (
          <div className="card-surface p-6 text-sm text-muted-foreground">
            Loading your profile...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="space-y-6">
              <section className="card-surface p-5 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-sm">
                    <UserRound className="h-9 w-9" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-bold">{displayName}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <AtSign className="h-4 w-4" />
                      <span className="truncate">{userEmail}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <VerificationBadge verified={phoneVerified} label="Phone" />
                      <VerificationBadge verified={emailVerified} label="Email" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="card-surface p-5 sm:p-7">
                <SectionHeading
                  icon={UserRound}
                  title="Personal Information"
                  description="Your private details used for account and owner verification."
                />
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <InfoField icon={UserRound} label="Full Name" value={profile.full_name} />
                  <InfoField icon={AtSign} label="Email" value={userEmail} />
                  <InfoField
                    icon={Phone}
                    label="Phone Number"
                    value={profile.phone ? `+91 ${profile.phone}` : null}
                  />
                  <InfoField
                    icon={MapPin}
                    label="Permanent Address"
                    value={profile.permanent_address}
                  />
                </div>
              </section>

              <section className="card-surface p-5 sm:p-7">
                <SectionHeading
                  icon={LockKeyhole}
                  title="Account & Security"
                  description="Your sign-in and account protection details."
                />
                <div className="mt-6 divide-y divide-border">
                  <SecurityRow
                    icon={AtSign}
                    title="Email address"
                    value={userEmail || "Not available"}
                    status={emailVerified ? "Verified" : "Not verified"}
                    verified={emailVerified}
                  />
                  <SecurityRow
                    icon={Phone}
                    title="Phone number"
                    value={profile.phone ? `+91 ${profile.phone}` : "Not added"}
                    status={phoneVerified ? "Added" : "Not added"}
                    verified={phoneVerified}
                  />
                  <SecurityRow
                    icon={LockKeyhole}
                    title="Password"
                    value="Managed securely by Room Renter"
                    status="Protected"
                    verified
                  />
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-7">
                <SectionHeading
                  icon={ShieldCheck}
                  title="Identity Verification"
                  description="Verify your identity to build trust with renters."
                />
                <div className="mt-6 space-y-3">
                  <VerificationRow
                    icon={Phone}
                    title="Phone Verification"
                    verified={phoneVerified}
                  />
                  <VerificationRow
                    icon={AtSign}
                    title="Email Verification"
                    verified={emailVerified}
                  />
                  <VerificationRow
                    icon={ShieldCheck}
                    title="Aadhaar Verification"
                    verified={profile.aadhaar_verified}
                    detail={
                      profile.aadhaar_last4
                        ? `Document ending in •••• ${profile.aadhaar_last4}`
                        : "Not submitted"
                    }
                  />
                </div>
              </section>

              <section className="card-surface p-5 sm:p-7">
                <SectionHeading
                  icon={ShieldCheck}
                  title="Verification Documents"
                  description="Only masked document information is shown here."
                />
                <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      <Home className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">Aadhaar Card</p>
                      <p className="mt-1 text-sm text-muted-foreground">Identity document</p>
                      <Badge
                        variant="secondary"
                        className="mt-3 rounded-full bg-muted text-muted-foreground"
                      >
                        {profile.aadhaar_verified
                          ? `Verified •••• ${profile.aadhaar_last4 ?? ""}`
                          : profile.aadhaar_last4
                            ? "Pending verification"
                            : "Not submitted"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </section>

              <LandlordVerificationCard
                onSaved={(nextProfile) =>
                  setProfile({
                    full_name: nextProfile.full_name,
                    phone: nextProfile.phone,
                    permanent_address: nextProfile.permanent_address,
                    aadhaar_last4: nextProfile.aadhaar_last4,
                    aadhaar_verified: nextProfile.aadhaar_verified,
                  })
                }
              />
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function InfoField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold">{value || "Not added yet"}</p>
    </div>
  );
}

function VerificationBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <Badge
      variant="secondary"
      className={
        verified
          ? "rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "rounded-full bg-muted text-muted-foreground"
      }
    >
      {verified ? "✓" : "⚠"} {label} {verified ? "Verified" : "Not verified"}
    </Badge>
  );
}

function VerificationRow({
  icon: Icon,
  title,
  verified,
  detail,
}: {
  icon: typeof UserRound;
  title: string;
  verified: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background/80 p-3">
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {detail ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      <Badge
        variant="secondary"
        className={
          verified
            ? "rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "rounded-full bg-muted text-muted-foreground"
        }
      >
        {verified ? "Verified" : "Not verified"}
      </Badge>
    </div>
  );
}

function SecurityRow({
  icon: Icon,
  title,
  value,
  status,
  verified,
}: {
  icon: typeof UserRound;
  title: string;
  value: string;
  status: string;
  verified: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{value}</p>
      </div>
      <span
        className={
          verified
            ? "text-xs font-semibold text-emerald-600"
            : "text-xs font-semibold text-muted-foreground"
        }
      >
        {status}
      </span>
    </div>
  );
}
