import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Layout";
import { RoleSwitch } from "./login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Room Renter" },
      {
        name: "description",
        content: "Create a Room Renter account as a room seeker or list your property as an owner in Lucknow.",
      },
      { property: "og:title", content: "Sign up — Room Renter" },
      { property: "og:description", content: "Separate sign up for room seekers and property owners." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { setRole } = useApp();
  const [role, setLocalRole] = useState<"seeker" | "owner">("seeker");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setRole(role);
    toast.success("Account created");
    navigate({ to: role === "owner" ? "/list-property" : "/search", search: role === "owner" ? undefined : { city: "Lucknow" } });
  };

  return (
    <Page footer={false}>
      <div className="container-page flex justify-center py-12 sm:py-16">
        <div className="card-surface w-full max-w-md p-6 sm:p-8">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Room seekers and property owners get their own space.
          </p>

          <div className="mt-5">
            <RoleSwitch role={role} onChange={setLocalRole} />
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ankit Sharma"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ph">Phone number</Label>
              <Input
                id="ph"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98XXXXXX21"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="rounded-xl"
              />
            </div>
            <Button type="submit" size="lg" className="w-full rounded-xl">
              <ShieldCheck className="h-4 w-4" />
              {role === "owner" ? "Create owner account" : "Create seeker account"}
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
