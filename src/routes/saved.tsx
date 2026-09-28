import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Heart, Search, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/PropertyCard";
import { fetchPropertyById, type Property } from "@/lib/properties";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/saved")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Saved Rooms — Room Renter" },
      { name: "description", content: "Your saved rooms on Room Renter." },
    ],
  }),
  component: SavedRoomsPage,
});

function SavedRoomsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("saved_properties")
        .select("property_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Saved rooms:", error);
        if (mounted) {
          setProperties([]);
          setLoading(false);
        }
        return;
      }

      const rows = data ?? [];
      const loaded = await Promise.all(
        rows.map((row) => fetchPropertyById(row.property_id)),
      );

      if (mounted) {
        setProperties(
          loaded.filter((property): property is Property => Boolean(property)),
        );
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Page>
      <div className="container-page py-8 sm:py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved Rooms</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Rooms you saved are kept in your account.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="card-surface mt-8 flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading saved rooms...
          </div>
        ) : properties.length === 0 ? (
          <div className="card-surface mt-8 p-12 text-center">
            <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No saved rooms yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Tap the heart on a room you like and it will appear here.
            </p>
            <Button asChild className="mt-5 rounded-xl">
              <Link to="/search">
                <Search className="mr-2 h-4 w-4" />
                Find a Room
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} showDeposit />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
