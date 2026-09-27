import { supabase } from "@/lib/supabase";

/* ============================================================
   PROPERTY TYPE
============================================================ */

export type Property = {
  id: number;

  landlordId?: string;

  title: string;
  description: string;

  rent: number;
  deposit: number;

  city: string;
  address: string;
  locality: string;
  area: string;

  roomType: string;

  bedrooms: number;
  bathrooms: number;

  available: boolean;

  furnished: string | boolean;
  gender: string;

  amenities: string[];
  images: string[];

  verified: boolean;

  rating: number;
  reviews: number;

  latitude: number | null;
  longitude: number | null;
};


/* ============================================================
   MAP SUPABASE ROW → APPLICATION PROPERTY
============================================================ */

function mapProperty(row: any): Property {
  return {
    /* -----------------------------
       Basic information
    ----------------------------- */

    id: Number(row.id),

    landlordId:
      row.landlord_id ??
      undefined,

    title:
      row.title ??
      "",

    description:
      row.description ??
      "",


    /* -----------------------------
       Pricing
    ----------------------------- */

    rent:
      Number(row.rent ?? 0),

    deposit:
      Number(row.deposit ?? 0),


    /* -----------------------------
       Location
    ----------------------------- */

    city:
      row.city ??
      "",

    address:
      row.address ??
      "",

    locality:
      row.locality ??
      "",

    area:
      row.locality ??
      row.area ??
      "",


    /* -----------------------------
       Room details
    ----------------------------- */

    roomType:
      row.room_type ??
      "Single Room",

    bedrooms:
      Number(row.bedrooms ?? 1),

    bathrooms:
      Number(row.bathrooms ?? 1),


    /* -----------------------------
       Availability
    ----------------------------- */

    available:
      row.available !== false,


    /* -----------------------------
       Furnishing / gender
    ----------------------------- */

    furnished:
      row.furnished ??
      false,

    gender:
      row.gender ??
      "Any",


    /* -----------------------------
       Amenities
    ----------------------------- */

    amenities:
      Array.isArray(row.amenities)
        ? row.amenities
        : [],


    /* -----------------------------
       Images
    ----------------------------- */

    images:
      Array.isArray(row.images)
        ? row.images
        : [],


    /* -----------------------------
       Optional fields
       
       These may not exist in the
       database, so we safely default.
    ----------------------------- */

    verified:
      Boolean(row.verified ?? false),

    rating:
      Number(row.rating ?? 0),

    reviews:
      Number(row.reviews ?? 0),


    /* -----------------------------
       REAL MAP COORDINATES

       These come directly from
       Supabase.
    ----------------------------- */

    latitude:
      row.latitude !== null &&
      row.latitude !== undefined &&
      row.latitude !== ""
        ? Number(row.latitude)
        : null,

    longitude:
      row.longitude !== null &&
      row.longitude !== undefined &&
      row.longitude !== ""
        ? Number(row.longitude)
        : null,
  };
}


/* ============================================================
   FETCH LISTED PROPERTIES
============================================================ */

export async function fetchListedProperties(
  city?: string,
): Promise<Property[]> {
  let query = supabase
    .from("properties")

    /*
     * IMPORTANT:
     *
     * Do NOT manually list columns here.
     *
     * select("*") prevents the query from failing
     * when optional columns such as rating/reviews/
     * verified are not present in the database.
     */
    .select("*")

    .eq(
      "available",
      true,
    )

    .order(
      "id",
      {
        ascending: false,
      },
    );


  /* -----------------------------
     Filter by city
  ----------------------------- */

  if (
    city &&
    city.trim()
  ) {
    query = query.eq(
      "city",
      city.trim(),
    );
  }


  /* -----------------------------
     Execute query
  ----------------------------- */

  const {
    data,
    error,
  } = await query;


  /* -----------------------------
     Error handling
  ----------------------------- */

  if (error) {
    console.error(
      "❌ fetchListedProperties error:",
      error,
    );

    throw new Error(
      error.message ||
        "Unable to load listed properties.",
    );
  }


  /* -----------------------------
     Convert rows
  ----------------------------- */

  const properties =
    (data ?? []).map(
      mapProperty,
    );


  console.log(
    "✅ Listed properties:",
    properties,
  );


  return properties;
}


/* ============================================================
   FETCH SINGLE PROPERTY
============================================================ */

export async function fetchPropertyById(
  id: string | number,
): Promise<Property | null> {

  const numericId =
    Number(id);


  /* -----------------------------
     Validate ID
  ----------------------------- */

  if (
    !Number.isFinite(
      numericId,
    )
  ) {
    console.error(
      "❌ Invalid property ID:",
      id,
    );

    return null;
  }


  /* -----------------------------
     Query Supabase
  ----------------------------- */

  const {
    data,
    error,
  } = await supabase

    .from("properties")

    .select("*")

    .eq(
      "id",
      numericId,
    )

    .maybeSingle();


  /* -----------------------------
     Error handling
  ----------------------------- */

  if (error) {
    console.error(
      "❌ fetchPropertyById error:",
      error,
    );

    throw new Error(
      error.message ||
        "Unable to load property.",
    );
  }


  /* -----------------------------
     Property not found
  ----------------------------- */

  if (!data) {
    return null;
  }


  /* -----------------------------
     Convert row
  ----------------------------- */

  return mapProperty(
    data,
  );
}