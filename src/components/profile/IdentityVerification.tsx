import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CreditCard, FileCheck2, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Verification = {
  id: number;
  document_type: string;
  document_path: string;
  status: "pending" | "verified" | "rejected";
  document_last4: string | null;
};

type Props = {
  aadhaarVerified: boolean;
  aadhaarLast4: string | number | null;
  phoneVerified: boolean;
  onAadhaarVerifiedStateChange?: (verified: boolean, last4: string | null) => void;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function IdentityVerification({
  aadhaarVerified,
  aadhaarLast4,
  phoneVerified,
  onAadhaarVerifiedStateChange,
}: Props) {
  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const otherIdInputRef = useRef<HTMLInputElement>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [selectedOtherId, setSelectedOtherId] = useState<string | null>(null);
  const [otherIdType, setOtherIdType] = useState<"passport" | "driving_license" | "voter_id">(
    "passport",
  );
  const [showOtherIdType, setShowOtherIdType] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const loadVerification = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("identity_verifications")
      .select("id, document_type, document_path, status, document_last4")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Load identity verification:", error);
      return;
    }

    setVerification(data as Verification | null);
  };

  useEffect(() => {
    void loadVerification();
  }, []);

  const uploadDocument = async (
    file: File,
    documentType: "aadhaar" | "passport" | "driving_license" | "voter_id",
  ) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMessage("Use JPG, PNG, WEBP or PDF only.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage("ID document must be smaller than 5 MB.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Your session has expired. Please log in again.");
      return;
    }

    setUploading(true);
    setMessage("");

    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeType = documentType.replace(/[^a-z_]/g, "");
    const path = `${user.id}/${safeType}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("identity-documents")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload identity document:", uploadError);
      setMessage(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: inserted, error: recordError } = await supabase
      .from("identity_verifications")
      .insert({
        user_id: user.id,
        document_type: documentType,
        document_path: path,
        status: "pending",
      })
      .select("id, document_type, document_path, status, document_last4")
      .single();

    if (recordError) {
      console.error("Create verification record:", recordError);
      await supabase.storage.from("identity-documents").remove([path]);
      setMessage("Document upload could not be registered. Please try again.");
      setUploading(false);
      return;
    }

    setVerification(inserted as Verification);
    setMessage("Document uploaded. Verification is now pending.");
    setUploading(false);
  };

  const handleAadhaar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadDocument(file, "aadhaar");
  };

  const handleOtherId = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      setSelectedOtherId(file.name);
      await uploadDocument(file, otherIdType);
      setShowOtherIdType(false);
    }
  };

  const statusText =
    verification?.status === "pending"
      ? "Verification pending"
      : verification?.status === "rejected"
        ? "Verification rejected"
        : verification?.status === "verified"
          ? "Verified"
          : null;

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-extrabold">Identification & Verification</h2>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Verify your identity to build trust with property owners.
          </p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-border rounded-2xl border">
        <VerificationRow
          icon={<CreditCard className="h-5 w-5" />}
          title="Aadhaar Card"
          description={
            aadhaarVerified
              ? `Verified •••• ${String(aadhaarLast4 ?? "")}`
              : statusText === "Verification pending"
                ? "Document submitted — verification pending"
                : "Upload Aadhaar for identity verification"
          }
          verified={aadhaarVerified}
          action={aadhaarVerified ? "Verified" : uploading ? "Uploading..." : "Upload"}
          onClick={() => aadhaarInputRef.current?.click()}
          disabled={uploading || aadhaarVerified}
        />

        <VerificationRow
          icon={<FileCheck2 className="h-5 w-5" />}
          title="Other Valid ID"
          description={selectedOtherId ?? "Passport, Driving Licence or Voter ID"}
          verified={false}
          action={uploading ? "Uploading..." : "Upload"}
          onClick={() => setShowOtherIdType((value) => !value)}
          disabled={uploading}
        />

        <VerificationRow
          icon={<Phone className="h-5 w-5" />}
          title="Phone Number"
          description={phoneVerified ? "Your phone number is verified" : "Verify your phone number"}
          verified={phoneVerified}
          action={phoneVerified ? "Verified" : "Verify"}
          onClick={() => undefined}
          disabled
        />
      </div>

      <input
        ref={aadhaarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleAadhaar}
      />
      <input
        ref={otherIdInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleOtherId}
      />

      {showOtherIdType && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border bg-muted/30 p-2">
          <select
            value={otherIdType}
            onChange={(event) => setOtherIdType(event.target.value as typeof otherIdType)}
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs"
          >
            <option value="passport">Passport</option>
            <option value="driving_license">Driving Licence</option>
            <option value="voter_id">Voter ID</option>
          </select>
          <button
            type="button"
            onClick={() => otherIdInputRef.current?.click()}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            Choose file
          </button>
        </div>
      )}

      {message && (
        <div
          className={`mt-3 rounded-xl p-3 text-xs ${message.includes("pending") ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
        >
          {message}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
        Documents are stored in a private bucket. Your complete Aadhaar number is never displayed on
        your profile.
      </p>
    </section>
  );
}

function VerificationRow({
  icon,
  title,
  description,
  verified,
  action,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  verified: boolean;
  action: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 sm:p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{description}</p>
      </div>
      {verified ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> : null}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {action}
      </button>
    </div>
  );
}
