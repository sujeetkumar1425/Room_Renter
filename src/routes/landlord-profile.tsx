import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  AtSign,
  Bell,
  Camera,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Home,
  LockKeyhole,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string | null;
  phone: string | null;
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
        content: "Manage your personal information and account security.",
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
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      setUserEmail(user.email ?? "");
      setEmailVerified(Boolean(user.email_confirmed_at));
      setProfile({
        full_name: data?.full_name ?? user.user_metadata?.full_name ?? "",
        phone: data?.phone ?? user.user_metadata?.phone ?? "",
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
      <div className="bg-background">
        <div className="container-page py-4 pb-6 sm:py-8">
          {loading ? (
            <div className="card-surface p-6 text-sm text-muted-foreground">
              Loading your profile...
            </div>
          ) : (
            <>
              {/* Mobile / tablet profile UI. The global Layout header remains the only header. */}
              <div className="mx-auto max-w-2xl lg:hidden">
                <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.08] via-background to-primary/[0.04] px-5 pb-6 pt-6 shadow-sm">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10" />
                  <div className="pointer-events-none absolute right-10 top-9 h-16 w-16 rotate-12 rounded-[1.5rem] bg-primary/10" />

                  <div className="relative min-h-[112px] pr-20">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                      Account Center
                    </p>

                    <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-foreground">
                      Your Profile
                    </h1>

                    <p className="mt-2 max-w-[250px] text-[12px] leading-[1.45] text-muted-foreground">
                      Manage your personal information and account security.
                    </p>

                    <div className="absolute right-0 top-7 flex h-[68px] w-[68px] items-center justify-center rounded-[24px] bg-primary/10">
                      <Home className="h-9 w-9 text-primary/70" strokeWidth={1.5} />
                    </div>
                  </div>
                </section>

                <section className="mt-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                        <UserRound className="h-8 w-8" strokeWidth={1.7} />
                      </div>

                      <button
                        type="button"
                        aria-label="Change profile photo"
                        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-card text-foreground shadow-sm"
                      >
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-[17px] font-extrabold leading-5 tracking-tight text-foreground">
                            {displayName}
                          </h2>
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {userEmail || "Email not available"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            document
                              .getElementById("profile-personal-info")
                              ?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/15"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <VerificationBadge verified={phoneVerified} label="Phone" />
                        <VerificationBadge verified={emailVerified} label="Email" />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="mt-4 space-y-2.5">
                  <div id="profile-personal-info">
                    <ProfileMenuCard
                      icon={UserRound}
                      title="Personal Information"
                      description="Your personal account details."
                    />
                  </div>

                  <ProfileMenuCard
                    icon={LockKeyhole}
                    title="Account & Security"
                    description="Manage your password, login methods and security."
                  />

                  <ProfileMenuCard
                    icon={CreditCard}
                    title="Payment Methods"
                    description="Manage your saved cards and payment details."
                  />

                  <ProfileMenuCard
                    icon={Bell}
                    title="Notifications"
                    description="Control what updates and alerts you receive."
                  />

                  <ProfileMenuCard
                    icon={CircleHelp}
                    title="Help & Support"
                    description="Get help, visit our FAQ or contact support."
                  />
                </div>
              </div>

              {/* Existing desktop experience. */}
              <div className="hidden lg:block">
                <div className="space-y-6">
                  <section className="card-surface p-7">
                    <SectionHeading
                      icon={UserRound}
                      title="Personal Information"
                      description="Your personal account details."
                    />
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <InfoField icon={UserRound} label="Full Name" value={profile.full_name} />
                      <InfoField icon={AtSign} label="Email" value={userEmail} />
                      <InfoField
                        icon={Phone}
                        label="Phone Number"
                        value={profile.phone ? `+91 ${profile.phone}` : null}
                      />
                    </div>
                  </section>
                  <section className="card-surface p-7">
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
              </div>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}

function ProfileMenuCard({
  icon: Icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group flex min-h-[68px] w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-3.5 py-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-sm"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-bold leading-5 text-foreground">{title}</span>
          {badge ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[10px] leading-[1.35] text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
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
