import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type LandlordProfile = {
  full_name: string | null;
  phone: string | null;
  permanent_address: string | null;
  aadhaar_last4: string | null;
  aadhaar_verified: boolean;
};

export function LandlordVerificationCard({
  onSaved,
}: {
  onSaved?: (profile: LandlordProfile) => void;
}) {
  const [profile, setProfile] = useState<LandlordProfile>({
    full_name: "",
    phone: "",
    permanent_address: "",
    aadhaar_last4: "",
    aadhaar_verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
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

      setProfile({
        full_name: data?.full_name ?? user.user_metadata?.full_name ?? "",
        phone: data?.phone ?? user.user_metadata?.phone ?? "",
        permanent_address: data?.permanent_address ?? "",
        aadhaar_last4: data?.aadhaar_last4 ?? "",
        aadhaar_verified: Boolean(data?.aadhaar_verified),
      });
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const update = (key: keyof LandlordProfile, value: string | boolean) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (saving) return;

    const phone = profile.phone?.trim() ?? "";
    const address = profile.permanent_address?.trim() ?? "";
    const aadhaarLast4 = profile.aadhaar_last4?.trim() ?? "";

    if (!profile.full_name?.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""))) {
      toast.error("Enter a valid 10-digit Indian phone number.");
      return;
    }
    if (address.length < 10) {
      toast.error("Please enter your complete permanent address.");
      return;
    }
    if (!/^\d{4}$/.test(aadhaarLast4)) {
      toast.error("Enter the last 4 digits of your Aadhaar.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in again.");

      const payload = {
        full_name: profile.full_name.trim(),
        phone: phone.replace(/\D/g, ""),
        permanent_address: address,
        aadhaar_last4: aadhaarLast4,
        // This remains false until a real KYC/Aadhaar verification process confirms it.
        aadhaar_verified: profile.aadhaar_verified,
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            role: "landlord",
            ...payload,
          },
          { onConflict: "id" },
        )
        .select("full_name, phone, permanent_address, aadhaar_last4, aadhaar_verified")
        .single();

      if (error) throw error;

      const nextProfile = {
        full_name: data.full_name,
        phone: data.phone,
        permanent_address: data.permanent_address,
        aadhaar_last4: data.aadhaar_last4,
        aadhaar_verified: Boolean(data.aadhaar_verified),
      };

      setProfile(nextProfile);
      onSaved?.(nextProfile);
      toast.success("Landlord details saved securely.");
    } catch (error) {
      console.error("Landlord profile update:", error);
      toast.error(error instanceof Error ? error.message : "Could not save landlord details.");
    } finally {
      setSaving(false);
    }
  };

  const complete =
    Boolean(profile.full_name?.trim()) &&
    /^[6-9]\d{9}$/.test(String(profile.phone ?? "").replace(/\D/g, "")) &&
    (profile.permanent_address?.trim().length ?? 0) >= 10 &&
    /^\d{4}$/.test(profile.aadhaar_last4 ?? "");

  if (loading) {
    return (
      <div className="mb-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading landlord verification details...
        </div>
      </div>
    );
  }

  return (
    <section className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Landlord identity details</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            These details are used for owner verification. Your full Aadhaar number and permanent
            address are never shown publicly on the listing.
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          {profile.aadhaar_verified ? "Identity verified" : "Verification pending"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Full legal name</Label>
          <Input
            value={profile.full_name ?? ""}
            onChange={(e) => update("full_name", e.target.value)}
            placeholder="As on your identity document"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Phone number</Label>
          <Input
            value={profile.phone ?? ""}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="10-digit mobile number"
            inputMode="numeric"
            maxLength={10}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Permanent address</Label>
          <Input
            value={profile.permanent_address ?? ""}
            onChange={(e) => update("permanent_address", e.target.value)}
            placeholder="Complete permanent address"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Aadhaar — last 4 digits</Label>
          <Input
            value={profile.aadhaar_last4 ?? ""}
            onChange={(e) => update("aadhaar_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="XXXX"
            inputMode="numeric"
            maxLength={4}
          />
          <p className="text-[11px] text-muted-foreground">
            Do not enter your complete Aadhaar number here.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {complete
            ? "Required owner details are complete."
            : "Complete all fields before publishing a property."}
        </p>
        <Button onClick={save} disabled={saving} className="rounded-xl">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save landlord details
        </Button>
      </div>
    </section>
  );
}
