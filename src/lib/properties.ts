import room1 from "@/assets/room-1.jpg";
import type { Property } from "@/lib/data";
import { supabase } from "@/lib/supabase";

export type DbProperty = {
  id: string;
  landlord_id: string;
  title: string | null;
  description: string | null;
  rent: number | null;
  deposit?: number | null;
  city: string | null;
  address: string | null;
  locality?: string | null;
  room_type: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  available: boolean | null;
  verified?: boolean | null;
  furnished?: string | null;
  gender?: string | null;
  amenities?: string[] | null;
  images?: string[] | null;
  created_at?: string | null;
};

const validRoomTypes = [
  "Single Room",
  "Shared Room",
  "1 BHK",
  "2 BHK",
  "Studio",
  "PG",
] as const;

function getRoomType(value: string | null): Property["roomType"] {
  if (
    value &&
    validRoomTypes.includes(
      value as Property["roomType"]
    )
  ) {
    return value as Property["roomType"];
  }

  return "Single Room";
}

function getFurnished(
  value: string | null
): Property["furnished"] {
  if (
    value === "Semi Furnished" ||
    value === "Unfurnished"
  ) {
    return value;
  }

  return "Fully Furnished";
}

function getGender(
  value: string | null
): Property["gender"] {
  if (value === "Male" || value === "Female") {
    return value;
  }

  return "Any";
}

export function mapDbProperty(
  row: DbProperty
): Property {
  return {
    id: row.id,

    title:
      row.title ||
      "Room listing",

    area:
      row.locality ||
      row.address ||
      row.city ||
      "Lucknow",

    city:
      row.city ||
      "Lucknow",

    rent:
      Number(row.rent || 0),

    deposit:
      Number(row.deposit || 0),

    rating: 0,

    reviews: 0,

    roomType:
      getRoomType(row.room_type),

    furnished:
      getFurnished(row.furnished || null),

    occupancy:
      row.bedrooms
        ? `${row.bedrooms} occupant${
            row.bedrooms > 1 ? "s" : ""
          }`
        : "Flexible occupancy",

    gender:
      getGender(row.gender || null),

    bathroom:
      Number(row.bathrooms || 0) > 0
        ? "Attached"
        : "Shared",

    food:
      Boolean(
        row.amenities?.includes("Food")
      ),

    parking:
      Boolean(
        row.amenities?.includes("Parking")
      ),

    verified:
      Boolean(row.verified),

    amenities:
      row.amenities || [],

    images:
      row.images &&
      row.images.length > 0
        ? row.images
        : [room1],

    distance:
      row.address ||
      "Listed property",

    available:
      row.available
        ? "Available now"
        : "Currently unavailable",

    description:
      row.description ||
      "No description provided.",

    nearby: [],

    landlord: {
      name: "Landlord",
      photo:
        "https://i.pravatar.cc/160?img=12",
      rating: 0,
      verified: false,
      responseRate: 0,
      responseTime: "Not available",
      since: "Recently joined",
      phone: "",
    },

    reviewList: [],

    coords: {
      top: "50%",
      left: "50%",
    },
  };
}

export async function fetchListedProperties(
  city?: string
) {
  let query = supabase
    .from("properties")
    .select("*")
    .eq("available", true)
    .order("created_at", {
      ascending: false,
    });

  if (city) {
    query = query.ilike(
      "city",
      city
    );
  }

  const { data, error } =
    await query;

  if (error) {
    throw error;
  }

  return (
    (data || []) as DbProperty[]
  ).map(mapDbProperty);
}

export async function fetchPropertyById(
  id: string
) {
  const { data, error } =
    await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? mapDbProperty(
        data as DbProperty
      )
    : null;
}