import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Home, Building2, Mail, Lock, Phone } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Room Renter" },
      { name: "description", content: "Log in to Room Renter as a room seeker or as a property owner." },
      { property: "og:title", content: "Login — Room Renter" },
      { property: "og:description", content: "Separate logins for room seekers and property owners." },
    ],
  }),
  component: LoginPage,
});

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

export function RoleSwitch({
  role,
  onChange,
}: {
  role: "seeker" | "owner";
  onChange: (r: "seeker" | "owner") => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {roleCards.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={cn(
            "rounded-2xl border p-4 text-left transition-all",
            role === r.key
              ? "border-primary bg-accent shadow-[var(--shadow-soft)]"
              : "border-border hover:bg-muted",
          )}
        >
          <r.icon className={cn("h-5 w-5", role === r.key ? "text-primary" : "text-muted-foreground")} />
          <p className="mt-2 font-semibold">{r.title}</p>
          <p className="text-xs text-muted-foreground">{r.text}</p>
        </button>
      ))}
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { setRole } = useApp();
  const [role, setLocalRole] = useState<"seeker" | "owner">("seeker");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setRole(role);
    toast.success(role === "owner" ? "Welcome back, owner!" : "Welcome back!");
    navigate({ to: role === "owner" ? "/landlord" : "/dashboard" });
  };

  return (
    <Page footer={false}>
      <div className="container-page flex justify-center py-12 sm:py-16">
        <div className="card-surface w-full max-w-md p-6 sm:p-8">
          <h1 className="text-2xl font-bold">Log in to Room Renter</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Choose how you want to continue.</p>

          <div className="mt-5">
            <RoleSwitch role={role} onChange={setLocalRole} />
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone or email</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98XXXXXX21"
                  className="rounded-xl pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pwd"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl pl-9"
                />
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full rounded-xl">
              <Mail className="h-4 w-4" /> Continue as {role === "owner" ? "Owner" : "Room Seeker"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to Room Renter?{" "}
            <Link to="/signup" className="font-semibold text-primary">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
