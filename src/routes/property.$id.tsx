import {
  createFileRoute,
  Link,
  notFound,
} from "@tanstack/react-router";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Star,
  MapPin,
  Heart,
  Share2,
  BadgeCheck,
  Wifi,
  Snowflake,
  WashingMachine,
  CookingPot,
  Car,
  ShowerHead,
  BatteryCharging,
  UtensilsCrossed,
  Phone,
  CalendarCheck,
  FileSignature,
  ShieldCheck,
  Navigation,
  ExternalLink,
} from "lucide-react";

import "leaflet/dist/leaflet.css";

import { Page } from "@/components/Layout";

import { Button } from "@/components/ui/button";

import { Progress } from "@/components/ui/progress";

import { toast } from "sonner";

import { formatINR } from "@/lib/data";

import {
  fetchPropertyById,
  fetchListedProperties,
} from "@/lib/properties";

import { PropertyCard } from "@/components/PropertyCard";

import { useApp } from "@/lib/app-context";

import { cn } from "@/lib/utils";


// ============================================================
// ROUTE
// ============================================================

export const Route =
  createFileRoute(
    "/property/$id",
  )({
    loader: async ({
      params,
    }) => {
      /*
       * Load the exact property from Supabase.
       */
      const property =
        await fetchPropertyById(
          params.id,
        );

      if (!property) {
        throw notFound();
      }


      /*
       * Load other properties for
       * Similar Rooms section.
       */
      let similar: typeof property[] =
        [];

      try {
        const listedProperties =
          await fetchListedProperties(
            property.city,
          );

        similar =
          listedProperties
            .filter(
              (p) =>
                p.id !==
                property.id,
            )
            .slice(0, 3);
      } catch (error) {
        /*
         * Similar properties should
         * never prevent the main
         * property page from loading.
         */
        console.error(
          "Unable to load similar properties:",
          error,
        );
      }


      return {
        property,
        similar,
      };
    },


    head: ({
      loaderData,
    }) => {
      if (!loaderData) {
        return {
          meta: [
            {
              title:
                "Room unavailable — Room Renter",
            },
            {
              name: "robots",
              content: "noindex",
            },
          ],
        };
      }

      const p =
        loaderData.property;

      const title =
        `${p.title} — ${formatINR(
          p.rent,
        )}/month | Room Renter`;

      const description =
        `${p.roomType} in ${p.area}, ${p.city}. ${p.furnished}, deposit ${formatINR(
          p.deposit,
        )}. Rated ${p.rating} by ${p.reviews} renters.`;

      return {
        meta: [
          {
            title,
          },
          {
            name: "description",
            content:
              description,
          },
          {
            property:
              "og:title",
            content:
              title,
          },
          {
            property:
              "og:description",
            content:
              description,
          },
        ],
      };
    },


    notFoundComponent:
      PropertyNotFound,

    component:
      PropertyPage,
  });


// ============================================================
// PROPERTY NOT FOUND
// ============================================================

function PropertyNotFound() {
  return (
    <Page>
      <div className="container-page py-20 text-center">

        <h1 className="text-2xl font-bold">
          This property is no longer available
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          The listing may have been rented out or paused by the owner.
        </p>

        <Button
          asChild
          className="mt-6 rounded-xl"
        >
          <Link
            to="/search"
            search={{
              city: "Lucknow",
            }}
          >
            Browse other rooms
          </Link>
        </Button>

      </div>
    </Page>
  );
}


// ============================================================
// AMENITY ICONS
// ============================================================

const amenityIcons: Record<
  string,
  typeof Wifi
> = {
  "Wi-Fi": Wifi,

  AC: Snowflake,

  "Washing Machine":
    WashingMachine,

  Kitchen:
    CookingPot,

  Parking:
    Car,

  "Attached Bathroom":
    ShowerHead,

  "Shared Bathroom":
    ShowerHead,

  "Power Backup":
    BatteryCharging,

  Food:
    UtensilsCrossed,
};


// ============================================================
// LANDLORD BADGES
// ============================================================

const badges = [
  "Identity Verified",
  "Owner Verified",
  "Property Verified",
];


// ============================================================
// DEFAULT MAP LOCATION
// ============================================================

const DEFAULT_LATITUDE =
  26.8467;

const DEFAULT_LONGITUDE =
  80.9462;


// ============================================================
// PROPERTY PAGE
// ============================================================

function PropertyPage() {
  const {
    property,
    similar,
  } =
    Route.useLoaderData();

  const {
    isSaved,
    toggleSaved,
  } = useApp();


  // ==========================================================
  // IMAGE STATE
  // ==========================================================

  const [
    active,
    setActive,
  ] = useState(0);


  // ==========================================================
  // SAVE STATE
  // ==========================================================

  const saved =
    isSaved(
      property.id,
    );


  // ==========================================================
  // MAP REFS
  // ==========================================================

  const mapContainerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const leafletMapRef =
    useRef<any>(null);

  const leafletRef =
    useRef<any>(null);


  // ==========================================================
  // REVIEW BREAKDOWN
  // ==========================================================

  const breakdown = [
    {
      label:
        "Cleanliness",
      value: 92,
    },
    {
      label:
        "Location",
      value: 88,
    },
    {
      label:
        "Owner support",
      value: 95,
    },
    {
      label:
        "Value for money",
      value: 84,
    },
  ];


  // ==========================================================
  // SAFE IMAGE ARRAY
  // ==========================================================

  const propertyImages =
    Array.isArray(
      property.images,
    )
      ? property.images.filter(
          (image) =>
            typeof image ===
              "string" &&
            image.trim()
              .length > 0,
        )
      : [];


  // ==========================================================
  // CURRENT IMAGE
  // ==========================================================

  const currentImage =
    propertyImages[
      active
    ] ??
    propertyImages[0] ??
    "";


  // ==========================================================
  // REAL PROPERTY COORDINATES
  // ==========================================================

  const latitude =
    Number(
      property.latitude,
    );

  const longitude =
    Number(
      property.longitude,
    );

  const hasLocation =
    Number.isFinite(
      latitude,
    ) &&
    Number.isFinite(
      longitude,
    ) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;


  // ==========================================================
  // INITIALIZE REAL OPENSTREETMAP MAP
  // ==========================================================

  useEffect(() => {
    if (
      !mapContainerRef.current
    ) {
      return;
    }

    if (
      !hasLocation
    ) {
      return;
    }

    let cancelled =
      false;


    async function initializeMap() {
      try {
        /*
         * Dynamic import is important.
         *
         * Leaflet accesses window/document,
         * so it must not be imported during
         * SSR.
         */
        const leaflet =
          await import(
            "leaflet"
          );

        if (
          cancelled
        ) {
          return;
        }


        leafletRef.current =
          leaflet;


        /*
         * Prevent duplicate maps
         * during React re-renders.
         */
        if (
          leafletMapRef.current
        ) {
          return;
        }


        /*
         * Create map.
         */
        const map =
          leaflet.map(
            mapContainerRef.current!,
            {
              center: [
                latitude,
                longitude,
              ],

              zoom: 16,

              zoomControl:
                true,
            },
          );


        leafletMapRef.current =
          map;


        /*
         * OpenStreetMap tiles.
         *
         * No Google Maps API key.
         * No billing.
         */
        leaflet
          .tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,

              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
          )
          .addTo(map);


        /*
         * Custom marker.
         *
         * Using divIcon means we don't
         * need Leaflet's PNG marker assets.
         */
        const markerIcon =
          leaflet.divIcon({
            className:
              "room-renter-property-marker",

            html: `
              <div
                style="
                  width: 42px;
                  height: 42px;
                  border-radius: 9999px;
                  background: #009688;
                  border: 4px solid white;
                  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                "
              >
                <div
                  style="
                    width: 12px;
                    height: 12px;
                    border-radius: 9999px;
                    background: white;
                  "
                ></div>
              </div>
            `,

            iconSize: [
              42,
              42,
            ],

            iconAnchor: [
              21,
              21,
            ],
          });


        /*
         * Add property marker.
         */
        const marker =
          leaflet.marker(
            [
              latitude,
              longitude,
            ],
            {
              icon:
                markerIcon,
            },
          );


        marker.addTo(
          map,
        );


        /*
         * Tooltip.
         */
        marker.bindTooltip(
          `
            <strong>
              ${property.title}
            </strong>
            <br />
            ${formatINR(
              property.rent,
            )}/month
          `,
          {
            direction:
              "top",

            offset: [
              0,
              -20,
            ],
          },
        );


        /*
         * Popup.
         */
        marker.bindPopup(
          `
            <div style="min-width:180px">
              <strong style="font-size:14px">
                ${property.title}
              </strong>

              <div style="margin-top:4px;font-size:13px">
                ${property.area || property.locality || ""}
              </div>

              <div style="margin-top:6px;font-weight:700;color:#009688">
                ${formatINR(
                  property.rent,
                )}/month
              </div>
            </div>
          `,
        );


        /*
         * Fix map dimensions after
         * page layout is complete.
         */
        setTimeout(
          () => {
            if (
              leafletMapRef.current
            ) {
              leafletMapRef.current.invalidateSize();
            }
          },
          100,
        );


        setTimeout(
          () => {
            if (
              leafletMapRef.current
            ) {
              leafletMapRef.current.invalidateSize();
            }
          },
          500,
        );

      } catch (error) {
        console.error(
          "Property map initialization failed:",
          error,
        );
      }
    }


    initializeMap();


    /*
     * Cleanup.
     */
    return () => {
      cancelled =
        true;
    };
  }, [
    hasLocation,
    latitude,
    longitude,
    property.id,
    property.title,
    property.rent,
    property.area,
    property.locality,
  ]);


  // ==========================================================
  // CLEANUP LEAFLET MAP
  // ==========================================================

  useEffect(() => {
    return () => {
      if (
        leafletMapRef.current
      ) {
        try {
          leafletMapRef.current.remove();
        } catch {
          // Ignore cleanup errors.
        }

        leafletMapRef.current =
          null;
      }
    };
  }, []);


  // ==========================================================
  // OPEN GOOGLE MAPS DIRECTIONS
  // ==========================================================

  const openDirections =
    () => {
      if (
        !hasLocation
      ) {
        toast.error(
          "Location coordinates are not available for this property.",
        );

        return;
      }


      const url =
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;


      window.open(
        url,
        "_blank",
        "noopener,noreferrer",
      );
    };


  // ==========================================================
  // SHARE PROPERTY
  // ==========================================================

  const shareProperty =
    async () => {
      try {
        if (
          navigator.share
        ) {
          await navigator.share(
            {
              title:
                property.title,

              text:
                `${property.title} — ${formatINR(
                  property.rent,
                )}/month`,

              url:
                window.location.href,
            },
          );

          return;
        }


        await navigator.clipboard.writeText(
          window.location.href,
        );

        toast.success(
          "Listing link copied",
        );

      } catch {
        /*
         * User cancelled native share.
         */
      }
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Page>

      <div className="container-page py-6">


        {/* ==================================================
            BREADCRUMBS
        =================================================== */}

        <nav className="mb-4 text-sm text-muted-foreground">

          <Link
            to="/"
            className="hover:text-primary"
          >
            Home
          </Link>

          {" · "}

          <Link
            to="/search"
            search={{
              city: "Lucknow",
            }}
            className="hover:text-primary"
          >
            Lucknow rooms
          </Link>

          {" · "}

          <span className="text-foreground">
            {property.area ||
              property.locality ||
              property.city}
          </span>

        </nav>


        {/* ==================================================
            IMAGE GALLERY
        =================================================== */}

        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">

          {/* MAIN IMAGE */}

          <div className="relative overflow-hidden rounded-2xl">

            {currentImage ? (
              <img
                src={
                  currentImage
                }
                alt={
                  property.title
                }
                width={1200}
                height={800}
                className="h-[280px] w-full object-cover sm:h-[420px]"
              />
            ) : (
              <div className="flex h-[280px] w-full items-center justify-center bg-muted sm:h-[420px]">
                <MapPin className="h-10 w-10 text-muted-foreground" />
              </div>
            )}


            {/* ACTION BUTTONS */}

            <div className="absolute right-3 top-3 flex gap-2">

              <button
                onClick={() =>
                  toggleSaved(
                    property.id,
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-[var(--shadow-soft)]"
                aria-label="Save property"
              >
                <Heart
                  className={cn(
                    "h-5 w-5",
                    saved &&
                      "fill-destructive text-destructive",
                  )}
                />
              </button>


              <button
                onClick={
                  shareProperty
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-[var(--shadow-soft)]"
                aria-label="Share property"
              >
                <Share2 className="h-[18px] w-[18px]" />
              </button>

            </div>

          </div>


          {/* THUMBNAILS */}

          <div className="grid grid-cols-4 gap-3 lg:grid-cols-2">

            {propertyImages.map(
              (
                image,
                index,
              ) => (
                <button
                  key={
                    image +
                    index
                  }
                  onClick={() =>
                    setActive(
                      index,
                    )
                  }
                  className={cn(
                    "overflow-hidden rounded-xl border-2 transition-all",
                    active ===
                      index
                      ? "border-primary"
                      : "border-transparent opacity-85",
                  )}
                >
                  <img
                    src={
                      image
                    }
                    alt={`${property.title} photo ${
                      index +
                      1
                    }`}
                    width={1200}
                    height={800}
                    loading="lazy"
                    className="h-20 w-full object-cover lg:h-[calc((420px-0.75rem)/2)]"
                  />
                </button>
              ),
            )}

          </div>

        </div>


        {/* ==================================================
            MAIN CONTENT
        =================================================== */}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">


          {/* =================================================
              LEFT CONTENT
          ================================================== */}

          <div className="space-y-8">


            {/* =================================================
                PROPERTY HEADER
            ================================================== */}

            <header>

              <div className="flex flex-wrap items-center gap-2">

                {property.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" />

                    Property Verified
                  </span>
                )}


                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {property.available
                    ? "Available"
                    : "Not available"}
                </span>

              </div>


              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
                {property.title}
              </h1>


              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">

                <span className="flex items-center gap-1.5">

                  <Star className="h-4 w-4 fill-warning text-warning" />

                  <span className="font-semibold text-foreground">
                    {property.rating}
                  </span>

                  (
                  {
                    property.reviews
                  }{" "}
                  reviews)

                </span>


                <span className="flex items-center gap-1.5">

                  <MapPin className="h-4 w-4" />

                  {property.area ||
                    property.locality}

                  ,{" "}
                  {
                    property.city
                  }

                </span>


                {property.distance && (
                  <span>
                    {
                      property.distance
                    }
                  </span>
                )}

              </div>


              {/* PROPERTY INFO */}

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                {[
                  {
                    k: "Room type",
                    v:
                      property.roomType,
                  },

                  {
                    k: "Furnishing",
                    v:
                      property.furnished,
                  },

                  {
                    k: "Occupancy",
                    v:
                      property.occupancy,
                  },

                  {
                    k: "Preferred",
                    v:
                      property.gender ===
                      "Any"
                        ? "Anyone"
                        : property.gender,
                  },
                ].map(
                  (item) => (
                    <div
                      key={
                        item.k
                      }
                      className="rounded-xl bg-muted px-3 py-2.5"
                    >

                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {
                          item.k
                        }
                      </p>

                      <p className="text-sm font-semibold">
                        {
                          String(
                            item.v ??
                              "",
                          )
                        }
                      </p>

                    </div>
                  ),
                )}

              </div>

            </header>


            {/* =================================================
                AMENITIES
            ================================================== */}

            <section>

              <h2 className="text-lg font-bold">
                Amenities
              </h2>


              {property.amenities.length >
              0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">

                  {property.amenities.map(
                    (
                      amenity,
                    ) => {
                      const Icon =
                        amenityIcons[
                          amenity
                        ] ??
                        ShieldCheck;

                      return (
                        <div
                          key={
                            amenity
                          }
                          className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5"
                        >

                          <Icon className="h-4.5 w-4.5 text-primary" />

                          <span className="text-sm font-medium">
                            {
                              amenity
                            }
                          </span>

                        </div>
                      );
                    },
                  )}

                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No amenities listed.
                </p>
              )}

            </section>


            {/* =================================================
                ABOUT
            ================================================== */}

            <section>

              <h2 className="text-lg font-bold">
                About this room
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {
                  property.description
                }
              </p>

            </section>


            {/* =================================================
                REAL MAP
            ================================================== */}

            <section>

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>

                  <h2 className="text-lg font-bold">
                    Location & nearby
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {property.address ||
                      property.area ||
                      property.locality ||
                      property.city}
                  </p>

                </div>


                {hasLocation && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={
                      openDirections
                    }
                  >
                    <Navigation className="h-4 w-4" />

                    Directions

                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}

              </div>


              {/* MAP */}

              {hasLocation ? (
                <div className="relative mt-3 overflow-hidden rounded-2xl border border-border">

                  <div
                    ref={
                      mapContainerRef
                    }
                    className="h-64 w-full sm:h-80"
                  />

                  {/* ADDRESS OVERLAY */}

                  <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[500]">

                    <div className="inline-flex max-w-full items-center gap-2 rounded-xl bg-background/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur">

                      <MapPin className="h-4 w-4 shrink-0 text-primary" />

                      <span className="truncate">
                        {property.address ||
                          property.area ||
                          property.locality ||
                          property.city}
                      </span>

                    </div>

                  </div>

                </div>
              ) : (
                <div className="mt-3 flex h-64 items-center justify-center rounded-2xl border border-border bg-muted sm:h-80">

                  <div className="px-6 text-center">

                    <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />

                    <p className="mt-3 font-semibold">
                      Location not available
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      The owner has not selected a map location for this property yet.
                    </p>

                  </div>

                </div>
              )}


              {/* NEARBY */}

              {property.nearby.length >
                0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">

                  {property.nearby.map(
                    (
                      place,
                    ) => (
                      <div
                        key={
                          place.name
                        }
                        className="flex items-center justify-between rounded-xl bg-muted px-3.5 py-2.5 text-sm"
                      >

                        <span>
                          {
                            place.name
                          }
                        </span>

                        <span className="font-medium text-muted-foreground">
                          {
                            place.distance
                          }
                        </span>

                      </div>
                    ),
                  )}

                </div>
              )}

            </section>


            {/* =================================================
                REVIEWS
            ================================================== */}

            <section>

              <h2 className="text-lg font-bold">
                Reviews & trust
              </h2>


              <div className="mt-3 grid gap-5 rounded-2xl border border-border p-5 sm:grid-cols-[160px_1fr]">

                {/* RATING */}

                <div className="text-center sm:text-left">

                  <p className="text-4xl font-extrabold">
                    {
                      property.rating
                    }
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {
                      property.reviews
                    }{" "}
                    reviews
                  </p>


                  <div className="mt-2 flex justify-center gap-0.5 sm:justify-start">

                    {[
                      1,
                      2,
                      3,
                      4,
                      5,
                    ].map(
                      (number) => (
                        <Star
                          key={
                            number
                          }
                          className={cn(
                            "h-4 w-4",

                            number <=
                              Math.round(
                                property.rating,
                              )
                              ? "fill-warning text-warning"
                              : "text-border",
                          )}
                        />
                      ),
                    )}

                  </div>

                </div>


                {/* BREAKDOWN */}

                <div className="space-y-2.5">

                  {breakdown.map(
                    (item) => (
                      <div
                        key={
                          item.label
                        }
                        className="flex items-center gap-3"
                      >

                        <span className="w-32 text-sm text-muted-foreground">
                          {
                            item.label
                          }
                        </span>

                        <Progress
                          value={
                            item.value
                          }
                          className="h-2 flex-1"
                        />

                        <span className="w-9 text-right text-xs font-medium">
                          {(
                            item.value /
                            20
                          ).toFixed(
                            1,
                          )}
                        </span>

                      </div>
                    ),
                  )}

                </div>

              </div>


              {/* REVIEW LIST */}

              {property.reviewList.length >
                0 && (
                <div className="mt-4 space-y-3">

                  {property.reviewList.map(
                    (
                      review,
                    ) => (
                      <div
                        key={
                          review.name +
                          review.date
                        }
                        className="card-surface p-4"
                      >

                        <div className="flex items-center gap-3">

                          {review.avatar ? (
                            <img
                              src={
                                review.avatar
                              }
                              alt={
                                review.name
                              }
                              width={40}
                              height={40}
                              loading="lazy"
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
                              {
                                review.name
                                  .charAt(
                                    0,
                                  )
                              }
                            </div>
                          )}

                          <div>

                            <p className="text-sm font-semibold">

                              {
                                review.name
                              }

                              <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                                Verified Renter
                              </span>

                            </p>

                            <p className="text-xs text-muted-foreground">
                              {
                                review.date
                              }{" "}
                              · ★{" "}
                              {
                                review.rating
                              }
                            </p>

                          </div>

                        </div>


                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {
                            review.text
                          }
                        </p>

                      </div>
                    ),
                  )}

                </div>
              )}

            </section>

          </div>


          {/* =================================================
              RIGHT SIDEBAR
          ================================================== */}

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">


            {/* =================================================
                PRICE CARD
            ================================================== */}

            <div className="card-surface p-5">

              <p className="text-3xl font-extrabold">

                {
                  formatINR(
                    property.rent,
                  )
                }

                <span className="text-base font-medium text-muted-foreground">
                  /month
                </span>

              </p>


              <p className="mt-1 text-sm text-muted-foreground">
                Security deposit{" "}
                {
                  formatINR(
                    property.deposit,
                  )
                }
              </p>


              <div className="mt-4 space-y-2">

                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-xl"
                >
                  <Link to="/messages">

                    <Phone className="h-4 w-4" />

                    Contact Owner

                  </Link>
                </Button>


                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full rounded-xl"
                >
                  <Link to="/visits">

                    <CalendarCheck className="h-4 w-4" />

                    Schedule Visit

                  </Link>
                </Button>

              </div>


              <p className="mt-3 text-center text-xs text-muted-foreground">
                No brokerage. Owner responds{" "}
                {
                  property.landlord
                    .responseTime
                }.
              </p>

            </div>


            {/* =================================================
                RENTAL AGREEMENT
            ================================================== */}

            <div className="card-surface border-primary/25 bg-accent/40 p-5">

              <div className="flex items-center gap-2">

                <FileSignature className="h-5 w-5 text-primary" />

                <h3 className="font-bold">
                  Rental Agreement
                </h3>

              </div>


              <p className="mt-2 text-sm text-muted-foreground">
                Create a rental agreement with your landlord before moving in.
              </p>


              <Button
                asChild
                className="mt-4 w-full rounded-xl"
              >
                <Link to="/agreement">
                  Create Agreement
                </Link>
              </Button>

            </div>


            {/* =================================================
                PROPERTY OWNER
            ================================================== */}

            <div className="card-surface p-5">

              <div className="flex items-center gap-3">

                {property.landlord.photo ? (
                  <img
                    src={
                      property.landlord.photo
                    }
                    alt={
                      property.landlord.name
                    }
                    width={56}
                    height={56}
                    loading="lazy"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-bold">
                    {
                      property.landlord.name.charAt(
                        0,
                      )
                    }
                  </div>
                )}


                <div>

                  <p className="font-semibold">
                    {
                      property.landlord
                        .name
                    }
                  </p>

                  <p className="flex items-center gap-1 text-xs text-muted-foreground">

                    <Star className="h-3 w-3 fill-warning text-warning" />

                    {
                      property.landlord
                        .rating
                    }

                    {" · "}

                    Owner since{" "}

                    {
                      property.landlord
                        .since ||
                      "Recently"
                    }

                  </p>

                </div>

              </div>


              {/* BADGES */}

              <div className="mt-3 flex flex-wrap gap-1.5">

                {badges.map(
                  (badge) => (
                    <span
                      key={
                        badge
                      }
                      className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {
                        badge
                      }
                    </span>
                  ),
                )}

              </div>


              {/* RESPONSE INFO */}

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">

                <div className="rounded-xl bg-muted px-3 py-2">

                  <p className="text-[11px] text-muted-foreground">
                    Response rate
                  </p>

                  <p className="font-semibold">
                    {
                      property.landlord
                        .responseRate
                    }
                    %
                  </p>

                </div>


                <div className="rounded-xl bg-muted px-3 py-2">

                  <p className="text-[11px] text-muted-foreground">
                    Responds in
                  </p>

                  <p className="font-semibold">
                    {
                      property.landlord
                        .responseTime
                    }
                  </p>

                </div>

              </div>

            </div>

          </aside>

        </div>


        {/* ==================================================
            SIMILAR ROOMS
        =================================================== */}

        {similar.length >
          0 && (
          <section className="mt-12">

            <h2 className="text-xl font-bold">
              Similar rooms in{" "}
              {
                property.city
              }
            </h2>


            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {similar.map(
                (item) => (
                  <PropertyCard
                    key={
                      item.id
                    }
                    property={
                      item
                    }
                  />
                ),
              )}

            </div>

          </section>
        )}

      </div>


      {/* ====================================================
          MOBILE STICKY CTA
      ===================================================== */}

      <div className="fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">

        <Button
          asChild
          variant="outline"
          className="flex-1 rounded-xl"
        >
          <Link to="/messages">
            Contact
          </Link>
        </Button>


        <Button
          asChild
          className="flex-1 rounded-xl"
        >
          <Link to="/visits">
            Schedule Visit
          </Link>
        </Button>

      </div>

    </Page>
  );
}