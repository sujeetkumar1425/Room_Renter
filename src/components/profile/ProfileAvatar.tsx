import { Camera, Loader2, UserRound } from "lucide-react";
import { useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

type ProfileAvatarProps = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  onUploaded: (url: string) => void;
  size?: "md" | "lg";
};

export function ProfileAvatar({
  userId,
  name,
  avatarUrl,
  onUploaded,
  size = "lg",
}: ProfileAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "R";

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Profile image must be smaller than 2 MB.");
      return;
    }

    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${userId}/avatar`, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar`);

      const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);

      if (profileError) throw profileError;

      onUploaded(avatarUrl);
    } catch (uploadError) {
      console.error("Upload profile image:", uploadError);
      setError("Unable to upload your profile image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const avatarSize = size === "lg" ? "h-20 w-20" : "h-16 w-16";
  const iconSize = size === "lg" ? "h-8 w-8" : "h-6 w-6";

  return (
    <div className="shrink-0">
      <div className="relative w-fit">
        <div
          className={`flex ${avatarSize} items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-bold text-primary ring-1 ring-primary/10`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${name}'s profile`} className="h-full w-full object-cover" />
          ) : initials ? (
            initials
          ) : (
            <UserRound className={iconSize} />
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile photo"
          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />
      </div>

      {error ? (
        <p className="mt-2 max-w-52 text-xs leading-5 text-destructive">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">JPG, PNG or WebP · max 2 MB</p>
      )}
    </div>
  );
}
