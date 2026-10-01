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
  phone: string;
  identityVerified: boolean;
};

export type Property = {
  id: string;
  landlordId?: string;

  title: string;
  description: string;

  rent: number;
  deposit: number;

  city: string;
  address: string;
  locality: string;
  area: string;

  roomType: "Single Room" | "Shared Room" | "1 BHK" | "2 BHK" | "Studio" | "PG";

  bedrooms: number;
  bathrooms: number;

  occupancy: string;

  available: string;

  furnished: "Fully Furnished" | "Semi Furnished" | "Unfurnished";

  gender: "Any" | "Male" | "Female";

  /* Legacy fields used by other pages */
  bathroom: "Attached" | "Shared";
  food: boolean;
  parking: boolean;

  amenities: string[];
  images: string[];

  verified: boolean;

  rating: number;
  reviews: number;

  /* Real map coordinates */
  latitude: number | null;
  longitude: number | null;

  /* Legacy map coordinates */
  coords: {
    top: string;
    left: string;
  };

  distance: string;

  nearby: NearbyPlace[];

  reviewList: PropertyReview[];

  landlord: PropertyLandlord;
};

/* ============================================================
   SAFE HELPERS
============================================================ */

function toNumber(value: unknown, fallback = 0): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function toCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

/* ============================================================
   ARRAY HELPERS
============================================================ */

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/* ============================================================
   MAP SUPABASE ROW → PROPERTY
============================================================ */

function mapProperty(row: JsonObject): Property {
  /* ==========================================================
      IMAGES
   ========================================================== */

  const images = toStringArray(row["images"]);

  /* ==========================================================
      AMENITIES
   ========================================================== */

  const amenities = toStringArray(row["amenities"]);

  /* ==========================================================
      COORDINATES
   ========================================================== */

  const latitude = toCoordinate(row["latitude"]);
  const longitude = toCoordinate(row["longitude"]);

  /* ==========================================================
      LANDLORD
   ========================================================== */

  const landlordData: JsonObject = isJsonObject(row["landlord"]) ? row["landlord"] : {};

  /* ==========================================================
      NEARBY PLACES
   ========================================================== */

  const nearbySource = Array.isArray(row["nearby"]) ? row["nearby"] : [];

  const nearby: NearbyPlace[] = nearbySource.filter(isJsonObject).map((item) => ({
    name: toStringValue(item["name"], "Nearby place"),
    distance: toStringValue(item["distance"], ""),
  }));

  /* ==========================================================
      REVIEWS
   ========================================================== */

  const reviewSource = Array.isArray(row["review_list"])
    ? row["review_list"]
    : Array.isArray(row["reviewList"])
      ? row["reviewList"]
      : [];

  const reviewList: PropertyReview[] = reviewSource.filter(isJsonObject).map((review) => ({
    name: toStringValue(review["name"], "Verified Renter"),
    date: toStringValue(review["date"], ""),
    rating: toNumber(review["rating"], 0),
    text: toStringValue(review["text"], ""),
    avatar: toStringValue(review["avatar"], ""),
  }));

  /* ==========================================================
      ROOM / BATHROOM
   ========================================================== */

  const bathroomValue = toStringValue(row["bathroom"] ?? row["bathrooms"], "Shared");

  const bathroom: "Attached" | "Shared" = bathroomValue.toLowerCase().includes("attach")
    ? "Attached"
    : "Shared";

  /* ==========================================================
      FOOD / PARKING
   ========================================================== */

  const food =
    typeof row["food"] === "boolean"
      ? row["food"]
      : amenities.some((item) => item.toLowerCase() === "food");

  const parking =
    typeof row["parking"] === "boolean"
      ? row["parking"]
      : amenities.some((item) => item.toLowerCase() === "parking");

  /* ==========================================================
      LEGACY MAP POSITION
   ========================================================== */

  const safeLatitude = latitude === null ? 50 : Math.max(5, Math.min(90, 50 - latitude));

  const safeLongitude = longitude === null ? 50 : Math.max(5, Math.min(90, 50 + longitude));

  /* ==========================================================
      RETURN PROPERTY
   ========================================================== */

  return {
    /* ID */

    id: toStringValue(row["id"], ""),

    /* LANDLORD ID */

    ...(typeof row["landlord_id"] === "string"
      ? {
          landlordId: row["landlord_id"],
        }
      : {}),

    /* BASIC INFORMATION */

    title: toStringValue(row["title"], "Room"),

    description: toStringValue(row["description"], "No description available."),

    /* PRICE */

    rent: toNumber(row["rent"], 0),

    deposit: toNumber(row["deposit"], 0),

    /* LOCATION */

    city: toStringValue(row["city"], ""),

    address: toStringValue(row["address"], ""),

    locality: toStringValue(row["locality"], ""),

    area: toStringValue(row["locality"] ?? row["area"] ?? row["address"], ""),

    /* ROOM INFORMATION */

    roomType: toRoomType(row["room_type"] ?? row["roomType"]),
    bedrooms: toNumber(row["bedrooms"], 1),
    bathrooms: toNumber(row["bathrooms"], 1),
    occupancy: toStringValue(row["occupancy"], "1"),

    /* AVAILABILITY */

    available:
      typeof row["available"] === "string"
        ? row["available"]
        : row["available"] === true
          ? "Available"
          : "Not Available",

    /* FURNISHING */

    furnished: toFurnished(row["furnished"]),
    gender: toGender(row["gender"]),
    /* LEGACY FIELDS */

    bathroom,

    food,

    parking,

    /* AMENITIES */

    amenities,

    /* IMAGES */

    images,

    /* VERIFICATION */

    verified: Boolean(row["verified"] ?? false),

    /* RATINGS */

    rating: toNumber(row["rating"] ?? row["average_rating"] ?? row["avg_rating"], 0),

    reviews: toNumber(row["review_count"] ?? row["reviews"] ?? row["reviews_count"], 0),

    /* REAL COORDINATES */

    latitude,

    longitude,

    /* LEGACY COORDINATES */

    coords: {
      top: `${safeLatitude}%`,
      left: `${safeLongitude}%`,
    },

    /* DETAIL PAGE */

    distance: toStringValue(row["distance"], ""),
    nearby,

    reviewList,

    /* LANDLORD */

    landlord: {
      name: toStringValue(landlordData["name"], "Property Owner"),

      photo: toStringValue(landlordData["photo"], ""),
      rating: toNumber(landlordData["rating"], 0),
      since: toStringValue(landlordData["since"], ""),
      responseRate: toNumber(landlordData["responseRate"], 0),
      responseTime: toStringValue(landlordData["responseTime"], "Usually responds quickly"),
      phone: toStringValue(row["landlord_phone"] ?? landlordData["phone"], ""),
      identityVerified: Boolean(
        row["landlord_identity_verified"] ?? landlordData["identityVerified"] ?? false,
      ),
    },
  };
}

/* ============================================================
   FETCH ALL LISTED PROPERTIES
============================================================ */

export async function fetchListedProperties(city?: string): Promise<Property[]> {
  let query = supabase.from("properties").select("*").eq("available", true).order("id", {
    ascending: false,
  });

  /* CITY FILTER */

  if (city && city.trim()) {
    query = query.eq("city", city.trim());
  }

  /* EXECUTE QUERY */

  const { data, error } = await query;

  /* ERROR */

  if (error) {
    console.error("fetchListedProperties error:", error);

    throw new Error(error.message || "Unable to load listed properties.");
  }

  /* NORMALIZE */

  return (data ?? []).map((row) => mapProperty(row as JsonObject));
}

/* ============================================================
   FETCH SINGLE PROPERTY
============================================================ */

export async function fetchPropertyById(id: string | number): Promise<Property | null> {
  const numericId = Number(id);

  /* VALIDATE ID */

  if (!Number.isFinite(numericId)) {
    console.error("Invalid property ID:", id);

    return null;
  }

  /* FETCH */

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", numericId)
    .maybeSingle();

  /* ERROR */

  if (error) {
    console.error("fetchPropertyById error:", error);

    throw new Error(error.message || "Unable to load property.");
  }

  /* NOT FOUND */

  if (!data) {
    return null;
  }

  /* NORMALIZE */

  return mapProperty(data as JsonObject);
}

function toRoomType(value: unknown): Property["roomType"] {
  const roomType = toStringValue(value, "Single Room");

  const validRoomTypes: Property["roomType"][] = [
    "Single Room",
    "Shared Room",
    "1 BHK",
    "2 BHK",
    "Studio",
    "PG",
  ];

  return validRoomTypes.includes(roomType as Property["roomType"])
    ? (roomType as Property["roomType"])
    : "Single Room";
}

function toFurnished(value: unknown): Property["furnished"] {
  const furnished = toStringValue(value, "Unfurnished");

  const validValues: Property["furnished"][] = ["Fully Furnished", "Semi Furnished", "Unfurnished"];

  return validValues.includes(furnished as Property["furnished"])
    ? (furnished as Property["furnished"])
    : "Unfurnished";
}

function toGender(value: unknown): Property["gender"] {
  const gender = toStringValue(value, "Any");

  return gender === "Male" || gender === "Female" ? gender : "Any";
}
