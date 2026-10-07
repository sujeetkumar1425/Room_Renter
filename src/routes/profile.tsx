import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  Bell,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileCheck2,
  Home,
  LockKeyhole,
  LogOut,
  MapPin,
  Pencil,
  Phone,
  Search,
  ShieldCheck,
  type LucideIcon,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Page } from "@/components/Layout";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string | null;

  phone: string | number | null;

  permanent_address: string | null;

  aadhaar_last4: string | number | null;

  aadhaar_verified: boolean | null;
};

export const Route = createFileRoute("/profile")({
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

    /*

     * IMPORTANT:

     * This is the renter profile route.

     * Landlord routing remains completely separate in

     * src/routes/landlord-profile.tsx.

     */

    if (profile?.role === "landlord") {
      throw redirect({ to: "/landlord-profile" });
    }
  },

  head: () => ({
    meta: [
      { title: "My Profile — Room Renter" },

      {
        name: "description",

        content: "Manage your renter profile, identity verification and preferences.",
      },
    ],
  }),

  component: RenterProfilePage,
});

function RenterProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    full_name: "",

    phone: "",

    permanent_address: "",

    aadhaar_last4: "",

    aadhaar_verified: false,
  });

  const [email, setEmail] = useState("");

  const [emailVerified, setEmailVerified] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [showPersonalInfo, setShowPersonalInfo] = useState(false);

  const [showPreferences, setShowPreferences] = useState(false);

  const idInputRef = useRef<HTMLInputElement>(null);

  const [selectedIdFile, setSelectedIdFile] = useState<File | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        if (mounted) setLoading(false);

        return;
      }

      const { data, error } = await supabase

        .from("profiles")

        .select("full_name, phone, permanent_address, aadhaar_last4, aadhaar_verified, avatar_url")

        .eq("id", currentUser.id)

        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Load renter profile:", error);
      }

      setEmail(currentUser.email ?? "");
      setEmailVerified(Boolean(currentUser.email_confirmed_at));
      setAvatarUrl(data?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null);

      setProfile({
        full_name:
          data?.full_name ??
          currentUser.user_metadata?.full_name ??
          currentUser.email?.split("@")[0] ??
          "",

        phone: data?.phone ?? currentUser.user_metadata?.phone ?? "",

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

  const displayName = profile.full_name || email.split("@")[0] || "Renter";

  const initials =
    displayName

      .split(" ")

      .filter(Boolean)

      .slice(0, 2)

      .map((part) => part.charAt(0).toUpperCase())

      .join("") || "R";

  const phoneVerified = Boolean(profile.phone);

  const aadhaarVerified = Boolean(profile.aadhaar_verified);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Please select a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Profile image must be smaller than 2 MB.");
      return;
    }

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      setMessage("Please login again before changing your profile image.");
      return;
    }

    const extension =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filePath = `${currentUser.id}/avatar.${extension}`;

    setMessage("Uploading profile image...");

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

    if (uploadError) {
      console.error("Upload profile image:", uploadError);
      setMessage(`Unable to upload profile image: ${uploadError.message}`);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: imageUrl })
      .eq("id", currentUser.id);

    if (profileError) {
      console.error("Save avatar URL:", profileError);
      setMessage("Image uploaded, but your profile could not be updated.");
      return;
    }

    setAvatarUrl(`${imageUrl}?t=${Date.now()}`);
    setMessage("Profile image updated successfully.");
  };

  const handleSave = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) return;

    const trimmedName = profile.full_name?.trim() ?? "";

    if (!trimmedName) {
      setMessage("Please enter your full name.");

      return;
    }

    setSaving(true);

    setMessage("");

    const { error } = await supabase

      .from("profiles")

      .update({
        full_name: trimmedName,

        permanent_address: profile.permanent_address?.trim() || null,
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

    setProfile((current) => ({
      ...current,

      full_name: trimmedName,

      permanent_address: profile.permanent_address?.trim() || null,
    }));

    setMessage("Profile updated successfully.");

    setSaving(false);
  };

  const handleIdSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) return;

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage("ID document must be smaller than 5 MB.");

      event.target.value = "";

      return;
    }

    setSelectedIdFile(file);

    setMessage(
      "ID selected. The verification upload can be connected to Supabase Storage once the private identity-document bucket is configured.",
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    window.location.href = "/";
  };

  if (loading) {
    return (
      <Page>
        <div className="container-page px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-2xl animate-pulse rounded-3xl border bg-card p-6">
            <div className="h-20 w-20 rounded-full bg-muted" />

            <div className="mt-4 h-6 w-44 rounded bg-muted" />

            <div className="mt-2 h-4 w-64 rounded bg-muted" />

            <div className="mt-8 h-20 rounded-2xl bg-muted" />
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {/* Header + BottomNav are intentionally NOT recreated here.

          Page from Layout.tsx already provides them. */}

      <div className="min-h-screen bg-background pb-6">
        <div className="container-page px-4 py-4 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-2xl space-y-3.5">
            {/* PROFILE CARD */}

            <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.10] via-background to-primary/[0.04] p-4 shadow-sm sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className="relative shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-extrabold text-primary sm:h-[72px] sm:w-[72px] sm:text-2xl">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={`${displayName} profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => void handleAvatarUpload(event)}
                  />

                  <button
                    type="button"
                    aria-label="Change profile photo"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                        Renter Profile
                      </p>

                      <h1 className="mt-1 truncate text-xl font-extrabold tracking-tight">
                        {displayName}
                      </h1>

                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {email || "Email not available"}
                      </p>
                    </div>

                    <button
                      type="button"

                      onClick={() => setShowPersonalInfo(true)}

                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/15"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <VerificationBadge
                      verified={phoneVerified}

                      label="Phone"
                    />

                    <VerificationBadge
                      verified={emailVerified}

                      label="Email"
                    />

                    <Badge
                      variant="secondary"

                      className="rounded-full bg-primary/10 text-primary"
                    >
                      Renter
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                <MiniStatus
                  icon={Phone}

                  title="Phone"

                  verified={phoneVerified}

                  value={phoneVerified ? "Verified" : "Not verified"}
                />

                <MiniStatus
                  icon={ShieldCheck}

                  title="Aadhaar"

                  verified={aadhaarVerified}

                  value={
                    aadhaarVerified ? `•••• ${String(profile.aadhaar_last4 ?? "")}` : "Not verified"
                  }
                />
              </div>
            </section>

            {/* PERSONAL INFORMATION */}

            <CollapsibleSection
              icon={UserRound}

              title="Personal Information"

              description="Your basic details and contact information."

              open={showPersonalInfo}

              onToggle={() => setShowPersonalInfo((value) => !value)}
            >
              <div className="space-y-4">
                <Field
                  label="Full Name"

                  value={profile.full_name ?? ""}

                  onChange={(value) =>
                    setProfile((current) => ({
                      ...current,

                      full_name: value,
                    }))
                  }
                />

                <div>
                  <label
                    htmlFor="renter-email"

                    className="mb-1.5 block text-xs font-semibold"
                  >
                    Email
                  </label>

                  <input
                    id="renter-email"

                    value={email}

                    disabled

                    className="h-10 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm text-muted-foreground"
                  />
                </div>

                <div>
                  <label
                    htmlFor="renter-phone"

                    className="mb-1.5 block text-xs font-semibold"
                  >
                    Phone
                  </label>

                  <input
                    id="renter-phone"

                    value={profile.phone ? String(profile.phone) : ""}

                    disabled

                    placeholder="Not added"

                    className="h-10 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm text-muted-foreground"
                  />
                </div>

                <div>
                  <label
                    htmlFor="renter-address"

                    className="mb-1.5 block text-xs font-semibold"
                  >
                    Address
                  </label>

                  <textarea
                    id="renter-address"

                    value={profile.permanent_address ?? ""}

                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,

                        permanent_address: event.target.value,
                      }))
                    }

                    placeholder="Add your permanent address"

                    rows={3}

                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                {message ? (
                  <div
                    className={`rounded-xl p-3 text-xs ${
                      message.includes("successfully")
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {message}
                  </div>
                ) : null}

                <Button
                  type="button"

                  onClick={() => void handleSave()}

                  disabled={saving}

                  className="w-full rounded-xl"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CollapsibleSection>

            {/* IDENTIFICATION & VERIFICATION */}

            <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <IconBox>
                  <ShieldCheck className="h-5 w-5" />
                </IconBox>

                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-extrabold">Identification & Verification</h2>

                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    Verify your identity to build trust with property owners.
                  </p>
                </div>
              </div>

              <div className="mt-4 divide-y divide-border rounded-2xl border">
                <VerificationRow
                  icon={CreditCard}

                  title="Aadhaar Card"

                  description={
                    aadhaarVerified
                      ? `Verified •••• ${String(profile.aadhaar_last4 ?? "")}`
                      : "Upload Aadhaar for identity verification"
                  }

                  verified={aadhaarVerified}

                  action={aadhaarVerified ? "Verified" : "Upload"}

                  onClick={() => {
                    /*

                     * We intentionally do not upload Aadhaar from this

                     * page yet. Your current database only stores the

                     * last four digits + verification flag.

                     *

                     * A private Supabase Storage bucket + verification

                     * table should be added before persisting documents.

                     */
                  }}
                />

                <VerificationRow
                  icon={FileCheck2}

                  title="Other Valid ID"

                  description={
                    selectedIdFile ? selectedIdFile.name : "Passport, Driving Licence or Voter ID"
                  }

                  verified={false}

                  action={selectedIdFile ? "Change" : "Upload"}

                  onClick={() => idInputRef.current?.click()}
                />

                <VerificationRow
                  icon={Phone}

                  title="Phone Number"

                  description={
                    phoneVerified ? "Your phone number is verified" : "Verify your phone number"
                  }

                  verified={phoneVerified}

                  action={phoneVerified ? "Verified" : "Verify"}

                  onClick={() => {
                    // Connect this to the existing OTP flow when available.
                  }}
                />
              </div>

              <input
                ref={idInputRef}

                type="file"

                accept="image/*,.pdf"

                className="hidden"

                onChange={handleIdSelection}
              />

              {selectedIdFile ? (
                <div className="mt-3 rounded-xl bg-primary/5 px-3 py-2.5 text-xs text-primary">
                  <span className="font-semibold">Selected:</span> {selectedIdFile.name}
                  <span className="ml-1 text-muted-foreground">
                    ({formatFileSize(selectedIdFile.size)})
                  </span>
                </div>
              ) : null}

              <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
                Your complete Aadhaar number should never be displayed on your profile. Verification
                documents should be stored in a private storage bucket.
              </p>
            </section>

            {/* PERSONALISATION */}

            <CollapsibleSection
              icon={SlidersHorizontal}

              title="Personalisation"

              description="Set your preferences for a better experience."

              open={showPreferences}

              onToggle={() => setShowPreferences((value) => !value)}
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <PreferenceCard
                  icon={MapPin}

                  title="Location Preferences"

                  description="Preferred cities and areas"
                />

                <PreferenceCard
                  icon={Home}

                  title="Room Preferences"

                  description="Room type, furnishing and gender"
                />

                <PreferenceCard
                  icon={Search}

                  title="Search Preferences"

                  description="Save your default filters"
                />

                <PreferenceCard
                  icon={CreditCard}

                  title="Budget Preferences"

                  description="Minimum and maximum rent"
                />
              </div>
            </CollapsibleSection>

            {/* OTHER SETTINGS */}

            <SettingRow
              icon={Bell}

              title="Notification Preferences"

              subtitle="Choose which updates and alerts you receive."
            />

            <SettingRow
              icon={LockKeyhole}

              title="Account & Privacy"

              subtitle="Security, privacy and legal information."
            />

            <SettingRow
              icon={CircleHelp}

              title="Help & Support"

              subtitle="FAQs, support and contact information."
            />

            {/* LOGOUT */}

            <button
              type="button"

              onClick={() => void handleLogout()}

              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 py-3.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
}

function CollapsibleSection({
  icon: Icon,

  title,

  description,

  open,

  onToggle,

  children,
}: {
  icon: LucideIcon;

  title: string;

  description: string;

  open: boolean;

  onToggle: () => void;

  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card shadow-sm">
      <button
        type="button"

        onClick={onToggle}

        className="flex w-full items-center gap-3 p-4 text-left sm:p-5"
      >
        <IconBox>
          <Icon className="h-5 w-5" />
        </IconBox>

        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold">{title}</span>

          <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
            {description}
          </span>
        </span>

        {open ? (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open ? (
        <div className="border-t border-border px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div>
      ) : null}
    </section>
  );
}

function VerificationRow({
  icon: Icon,

  title,

  description,

  verified,

  action,

  onClick,
}: {
  icon: LucideIcon;

  title: string;

  description: string;

  verified: boolean;

  action: string;

  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>

        <p className="mt-0.5 truncate text-[10px] leading-4 text-muted-foreground">{description}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {verified ? (
          <span className="hidden items-center gap-1 text-[10px] font-bold text-emerald-600 sm:inline-flex">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : null}

        <button
          type="button"

          onClick={onClick}

          className={`rounded-xl px-3 py-2 text-[10px] font-bold ${
            verified ? "bg-emerald-50 text-emerald-700" : "bg-primary text-primary-foreground"
          }`}
        >
          {action}
        </button>
      </div>
    </div>
  );
}

function PreferenceCard({
  icon: Icon,

  title,

  description,
}: {
  icon: LucideIcon;

  title: string;

  description: string;
}) {
  return (
    <button
      type="button"

      className="flex items-center gap-3 rounded-2xl border border-border/60 p-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold">{title}</span>

        <span className="mt-0.5 block text-[10px] text-muted-foreground">{description}</span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function SettingRow({
  icon: Icon,

  title,

  subtitle,
}: {
  icon: LucideIcon;

  title: string;

  subtitle: string;
}) {
  return (
    <button
      type="button"

      className="flex w-full items-center gap-3 rounded-3xl border border-border/60 bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/30 sm:p-5"
    >
      <IconBox>
        <Icon className="h-5 w-5" />
      </IconBox>

      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold">{title}</span>

        <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{subtitle}</span>
      </span>

      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function Field({
  label,

  value,

  onChange,
}: {
  label: string;

  value: string;

  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold">{label}</label>

      <input
        value={value}

        onChange={(event) => onChange(event.target.value)}

        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      {children}
    </div>
  );
}

function MiniStatus({
  icon: Icon,

  title,

  verified,

  value,
}: {
  icon: LucideIcon;

  title: string;

  verified: boolean;

  value: string;
}) {
  return (
    <div className="rounded-2xl bg-background/80 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />

        {title}
      </div>

      <div className="mt-1 flex items-center gap-1 text-[10px]">
        {verified ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}

        <span className={verified ? "font-semibold text-emerald-700" : "text-muted-foreground"}>
          {value}
        </span>
      </div>
    </div>
  );
}

function VerificationBadge({
  verified,

  label,
}: {
  verified: boolean;

  label: string;
}) {
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleLogout() {
  await supabase.auth.signOut();

  window.location.href = "/";
}
