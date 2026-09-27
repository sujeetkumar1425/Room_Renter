import { supabase } from "@/lib/supabase";

/* ============================================================
   PROPERTY TYPES
============================================================ */

export type NearbyPlace = {
  name: string;
  distance: string;
};

export type PropertyReview = {
  name: string;
  date: string;
  rating: number;
  text: string;
  avatar: string;
};

export type PropertyLandlord = {
  name: string;
  photo: string;
  rating: number;
  since: string;
  responseRate: number;
  responseTime: string;
};

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

  occupancy: string | number;

  available: boolean;

  furnished: string | boolean;

  gender: string;

  amenities: string[];

  images: string[];

  verified: boolean;

  rating: number;

  reviews: number;

  /* ==========================================================
     REAL MAP LOCATION
  ========================================================== */

  latitude: number | null;

  longitude: number | null;

  /* ==========================================================
     PROPERTY DETAIL PAGE DATA
  ========================================================== */

  distance: string;

  nearby: NearbyPlace[];

  reviewList: PropertyReview[];

  landlord: PropertyLandlord;
};


/* ============================================================
   SAFE NUMBER HELPER
============================================================ */

function toNumber(
  value: unknown,
  fallback = 0,
): number {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : fallback;
}


/* ============================================================
   SAFE COORDINATE HELPER
============================================================ */

function toCoordinate(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return null;
  }

  return number;
}


/* ============================================================
   SAFE STRING HELPER
============================================================ */

function toStringValue(
  value: unknown,
  fallback = "",
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return String(value);
}


/* ============================================================
   MAP SUPABASE ROW → PROPERTY OBJECT
============================================================ */

function mapProperty(
  row: any,
): Property {
  /* ==========================================================
     IMAGES
  ========================================================== */

  const images: string[] =
    Array.isArray(
      row?.images,
    )
      ? row.images.filter(
          (
            image: unknown,
          ) =>
            typeof image ===
              "string" &&
            image.trim()
              .length > 0,
        )
      : [];


  /* ==========================================================
     AMENITIES
  ========================================================== */

  const amenities: string[] =
    Array.isArray(
      row?.amenities,
    )
      ? row.amenities
          .filter(
            (
              item: unknown,
            ) =>
              typeof item ===
              "string",
          )
          .map(
            (
              item: string,
            ) => item.trim(),
          )
          .filter(Boolean)
      : [];


  /* ==========================================================
     COORDINATES
  ========================================================== */

  const latitude =
    toCoordinate(
      row?.latitude,
    );

  const longitude =
    toCoordinate(
      row?.longitude,
    );


  /* ==========================================================
     LANDLORD DATA
     
     Your properties table may not contain an embedded
     landlord object. We therefore safely provide defaults.
  ========================================================== */

  const landlordData =
    row?.landlord &&
    typeof row.landlord ===
      "object"
      ? row.landlord
      : null;


  /* ==========================================================
     NEARBY PLACES
  ========================================================== */

  const nearby: NearbyPlace[] =
    Array.isArray(
      row?.nearby,
    )
      ? row.nearby
          .filter(
            (item: any) =>
              item &&
              typeof item ===
                "object",
          )
          .map(
            (
              item: any,
            ) => ({
              name:
                toStringValue(
                  item.name,
                  "Nearby place",
                ),

              distance:
                toStringValue(
                  item.distance,
                  "",
                ),
            }),
          )
      : [];


  /* ==========================================================
     REVIEWS
  ========================================================== */

  const reviewSource =
    Array.isArray(
      row?.review_list,
    )
      ? row.review_list
      : Array.isArray(
          row?.reviewList,
        )
        ? row.reviewList
        : [];

  const reviewList: PropertyReview[] =
    reviewSource.map(
      (
        review: any,
      ) => ({
        name:
          toStringValue(
            review?.name,
            "Verified Renter",
          ),

        date:
          toStringValue(
            review?.date,
            "",
          ),

        rating:
          toNumber(
            review?.rating,
            0,
          ),

        text:
          toStringValue(
            review?.text,
            "",
          ),

        avatar:
          toStringValue(
            review?.avatar,
            "",
          ),
      }),
    );


  /* ==========================================================
     RETURN NORMALIZED PROPERTY
  ========================================================== */

  return {
    /* --------------------------------------------------------
       ID
    -------------------------------------------------------- */

    id: toNumber(
      row?.id,
      0,
    ),


    /* --------------------------------------------------------
       LANDLORD ID
    -------------------------------------------------------- */

    landlordId:
      row?.landlord_id ??
      undefined,


    /* --------------------------------------------------------
       BASIC INFORMATION
    -------------------------------------------------------- */

    title:
      toStringValue(
        row?.title,
        "Room",
      ),

    description:
      toStringValue(
        row?.description,
        "No description available.",
      ),


    /* --------------------------------------------------------
       PRICE
    -------------------------------------------------------- */

    rent:
      toNumber(
        row?.rent,
        0,
      ),

    deposit:
      toNumber(
        row?.deposit,
        0,
      ),


    /* --------------------------------------------------------
       LOCATION
    -------------------------------------------------------- */

    city:
      toStringValue(
        row?.city,
        "",
      ),

    address:
      toStringValue(
        row?.address,
        "",
      ),

    locality:
      toStringValue(
        row?.locality,
        "",
      ),

    area:
      toStringValue(
        row?.locality ??
          row?.area ??
          row?.address,
        "",
      ),


    /* --------------------------------------------------------
       ROOM INFORMATION
    -------------------------------------------------------- */

    roomType:
      toStringValue(
        row?.room_type ??
          row?.roomType,
        "Single Room",
      ),

    bedrooms:
      toNumber(
        row?.bedrooms,
        1,
      ),

    bathrooms:
      toNumber(
        row?.bathrooms,
        1,
      ),

    occupancy:
      row?.occupancy ??
      row?.bedrooms ??
      1,


    /* --------------------------------------------------------
       AVAILABILITY
    -------------------------------------------------------- */

    available:
      row?.available !== false,


    /* --------------------------------------------------------
       FURNISHING
    -------------------------------------------------------- */

    furnished:
      row?.furnished ??
      "Unfurnished",


    /* --------------------------------------------------------
       GENDER
    -------------------------------------------------------- */

    gender:
      toStringValue(
        row?.gender,
        "Any",
      ),


    /* --------------------------------------------------------
       AMENITIES
    -------------------------------------------------------- */

    amenities,


    /* --------------------------------------------------------
       IMAGES
    -------------------------------------------------------- */

    images,


    /* --------------------------------------------------------
       VERIFICATION
    -------------------------------------------------------- */

    verified:
      Boolean(
        row?.verified ??
          false,
      ),


    /* --------------------------------------------------------
       RATINGS
    -------------------------------------------------------- */

    rating:
      toNumber(
        row?.rating,
        0,
      ),

    reviews:
      toNumber(
        row?.reviews,
        0,
      ),


    /* ========================================================
       REAL OPENSTREETMAP / LEAFLET COORDINATES
    ======================================================== */

    latitude,

    longitude,


    /* ========================================================
       PROPERTY DETAIL PAGE FIELDS
    ======================================================== */

    distance:
      toStringValue(
        row?.distance,
        "",
      ),

    nearby,

    reviewList,


    /* ========================================================
       LANDLORD
    ======================================================== */

    landlord: {
      name:
        toStringValue(
          landlordData?.name,
          "Property Owner",
        ),

      photo:
        toStringValue(
          landlordData?.photo,
          "",
        ),

      rating:
        toNumber(
          landlordData?.rating,
          0,
        ),

      since:
        toStringValue(
          landlordData?.since,
          "",
        ),

      responseRate:
        toNumber(
          landlordData?.responseRate,
          0,
        ),

      responseTime:
        toStringValue(
          landlordData?.responseTime,
          "Usually responds quickly",
        ),
    },
  };
}


/* ============================================================
   FETCH ALL LISTED PROPERTIES
============================================================ */

export async function fetchListedProperties(
  city?: string,
): Promise<Property[]> {
  let query =
    supabase
      .from("properties")
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


  /* ==========================================================
     CITY FILTER
  ========================================================== */

  if (
    city &&
    city.trim()
  ) {
    query =
      query.eq(
        "city",
        city.trim(),
      );
  }


  /* ==========================================================
     EXECUTE QUERY
  ========================================================== */

  const {
    data,
    error,
  } = await query;


  /* ==========================================================
     ERROR
  ========================================================== */

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


  /* ==========================================================
     NORMALIZE RESULTS
  ========================================================== */

  const properties =
    (data ?? []).map(
      (
        row,
      ) =>
        mapProperty(
          row,
        ),
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
  /* ==========================================================
     CONVERT ID
  ========================================================== */

  const numericId =
    Number(id);


  /* ==========================================================
     VALIDATE ID
  ========================================================== */

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


  /* ==========================================================
     FETCH PROPERTY
  ========================================================== */

  const {
    data,
    error,
  } =
    await supabase
      .from("properties")
      .select("*")
      .eq(
        "id",
        numericId,
      )
      .maybeSingle();


  /* ==========================================================
     ERROR
  ========================================================== */

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


  /* ==========================================================
     PROPERTY NOT FOUND
  ========================================================== */

  if (!data) {
    return null;
  }


  /* ==========================================================
     NORMALIZE PROPERTY
  ========================================================== */

  return mapProperty(
    data,
  );
}