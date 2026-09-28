import {
  createFileRoute,
  Link,
  redirect,
} from "@tanstack/react-router";

import {
  Heart,
  Search,
  Loader2,
  RefreshCw,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/PropertyCard";
import {
  fetchPropertyById,
  type Property,
} from "@/lib/properties";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/saved")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({
        to: "/login",
      });
    }
  },

  head: () => ({
    meta: [
      {
        title: "Saved Rooms — Room Renter",
      },
      {
        name: "description",
        content:
          "Your saved rooms on Room Renter.",
      },
    ],
  }),

  component: SavedRoomsPage,
});

function SavedRoomsPage() {
  const { saved } = useApp();

  const [properties, setProperties] =
    useState<Property[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadSavedRooms = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProperties([]);
        return;
      }

      /* ======================================================
         GET SAVED PROPERTY IDS FROM SUPABASE
      ====================================================== */

      const {
        data: savedRows,
        error: savedError,
      } = await supabase
        .from("saved_properties")
        .select("property_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (savedError) {
        console.error(
          "❌ Saved rooms query:",
          savedError,
        );

        setErrorMessage(
          savedError.message ||
            "Unable to load saved rooms.",
        );

        setProperties([]);
        return;
      }

      const rows = savedRows ?? [];

      /* ======================================================
         NO SAVED ROOMS
      ====================================================== */

      if (rows.length === 0) {
        setProperties([]);
        return;
      }

      /* ======================================================
         FETCH EACH PROPERTY
      ====================================================== */

      const loaded =
        await Promise.all(
          rows.map((row) =>
            fetchPropertyById(
              String(row.property_id),
            ),
          ),
        );

      const validProperties =
        loaded.filter(
          (
            property,
          ): property is Property =>
            Boolean(property),
        );

      setProperties(
        validProperties,
      );
    } catch (error) {
      console.error(
        "❌ Saved rooms error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load saved rooms.",
      );

      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedRooms();
  }, []);

  /*
   * If the user removes a room from the Saved page,
   * refresh the displayed list when the saved IDs change.
   */
  useEffect(() => {
    if (!loading) {
      loadSavedRooms();
    }
  }, [saved.join(",")]);

  return (
    <Page>
      <div className="container-page py-8 sm:py-12">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Saved Rooms
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Rooms you saved are kept in your account.
              </p>
            </div>

          </div>

          {!loading &&
            properties.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={loadSavedRooms}
                aria-label="Refresh saved rooms"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="card-surface mt-8 flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading saved rooms...
          </div>
        )}

        {/* ERROR */}
        {!loading &&
          errorMessage && (
            <div className="card-surface mt-8 p-10 text-center">

              <Heart className="mx-auto h-8 w-8 text-destructive" />

              <h2 className="mt-4 text-lg font-semibold">
                Could not load saved rooms
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {errorMessage}
              </p>

              <Button
                className="mt-5 rounded-xl"
                onClick={loadSavedRooms}
              >
                Try Again
              </Button>

            </div>
          )}

        {/* EMPTY */}
        {!loading &&
          !errorMessage &&
          properties.length === 0 && (
            <div className="card-surface mt-8 p-12 text-center">

              <Heart className="mx-auto h-8 w-8 text-muted-foreground" />

              <h2 className="mt-4 text-lg font-semibold">
                No saved rooms yet
              </h2>

              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Tap the heart on a room you like and
                it will appear here.
              </p>

              <Button
                asChild
                className="mt-5 rounded-xl"
              >
                <Link to="/search">
                  <Search className="mr-2 h-4 w-4" />
                  Find a Room
                </Link>
              </Button>

            </div>
          )}

        {/* SAVED ROOMS */}
        {!loading &&
          !errorMessage &&
          properties.length > 0 && (
            <>
              <div className="mt-8 mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {properties.length}{" "}
                  {properties.length === 1
                    ? "saved room"
                    : "saved rooms"}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map(
                  (property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      showDeposit
                    />
                  ),
                )}
              </div>
            </>
          )}

      </div>
    </Page>
  );
}