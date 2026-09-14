import room1 from "@/assets/room-1.jpg";
import room2 from "@/assets/room-2.jpg";
import room3 from "@/assets/room-3.jpg";
import room4 from "@/assets/room-4.jpg";
import room5 from "@/assets/room-5.jpg";
import room6 from "@/assets/room-6.jpg";

export const ACTIVE_CITY = "Lucknow";

export type City = { name: string; state: string; available: boolean; rooms?: number };

export const CITIES: City[] = [
  { name: "Lucknow", state: "Uttar Pradesh", available: true, rooms: 1240 },
  { name: "Delhi", state: "NCR", available: false },
  { name: "Noida", state: "Uttar Pradesh", available: false },
  { name: "Gurgaon", state: "Haryana", available: false },
  { name: "Bengaluru", state: "Karnataka", available: false },
  { name: "Mumbai", state: "Maharashtra", available: false },
  { name: "Pune", state: "Maharashtra", available: false },
  { name: "Hyderabad", state: "Telangana", available: false },
];

export function isCityAvailable(city?: string | null) {
  return !!city && city.trim().toLowerCase() === ACTIVE_CITY.toLowerCase();
}

export type Landlord = {
  name: string;
  photo: string;
  rating: number;
  verified: boolean;
  responseRate: number;
  responseTime: string;
  since: string;
  phone: string;
};

export type Review = {
  name: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
};

export type Property = {
  id: string;
  title: string;
  area: string;
  city: string;
  rent: number;
  deposit: number;
  rating: number;
  reviews: number;
  roomType: "Single Room" | "Shared Room" | "1 BHK" | "2 BHK" | "Studio" | "PG";
  furnished: "Fully Furnished" | "Semi Furnished" | "Unfurnished";
  occupancy: string;
  gender: "Any" | "Male" | "Female";
  bathroom: "Attached" | "Shared";
  food: boolean;
  parking: boolean;
  verified: boolean;
  amenities: string[];
  images: string[];
  distance: string;
  available: string;
  description: string;
  nearby: { name: string; distance: string }[];
  landlord: Landlord;
  reviewList: Review[];
  coords: { top: string; left: string };
};

const landlords: Landlord[] = [
  {
    name: "Rajeev Srivastava",
    photo: "https://i.pravatar.cc/160?img=12",
    rating: 4.8,
    verified: true,
    responseRate: 96,
    responseTime: "under 30 min",
    since: "2021",
    phone: "+91 98765 43210",
  },
  {
    name: "Anjali Verma",
    photo: "https://i.pravatar.cc/160?img=45",
    rating: 4.9,
    verified: true,
    responseRate: 99,
    responseTime: "under 15 min",
    since: "2020",
    phone: "+91 99887 66554",
  },
  {
    name: "Mohd. Faizan Ali",
    photo: "https://i.pravatar.cc/160?img=33",
    rating: 4.6,
    verified: true,
    responseRate: 91,
    responseTime: "under 1 hour",
    since: "2022",
    phone: "+91 90123 45678",
  },
];

const reviewPool: Review[][] = [
  [
    {
      name: "Ankit Tiwari",
      avatar: "https://i.pravatar.cc/100?img=15",
      rating: 5,
      date: "Aug 2026",
      text: "Very clean room and the owner is genuinely helpful. Water and power backup never an issue.",
    },
    {
      name: "Shreya Mishra",
      avatar: "https://i.pravatar.cc/100?img=47",
      rating: 4,
      date: "Jul 2026",
      text: "Great location, 10 minutes from my office. Wi-Fi speed could be a bit better.",
    },
  ],
  [
    {
      name: "Harsh Yadav",
      avatar: "https://i.pravatar.cc/100?img=52",
      rating: 5,
      date: "Sep 2026",
      text: "Fully furnished as shown in photos. Agreement process on Room Renter was smooth.",
    },
    {
      name: "Nikita Singh",
      avatar: "https://i.pravatar.cc/100?img=32",
      rating: 5,
      date: "Jun 2026",
      text: "Safe area for working women, food quality is homely and the kitchen is spotless.",
    },
  ],
];

export const PROPERTIES: Property[] = [
  {
    id: "lko-gomti-01",
    title: "Fully Furnished Room in Gomti Nagar",
    area: "Gomti Nagar",
    city: "Lucknow",
    rent: 10000,
    deposit: 20000,
    rating: 4.8,
    reviews: 24,
    roomType: "Single Room",
    furnished: "Fully Furnished",
    occupancy: "Single occupancy",
    gender: "Any",
    bathroom: "Attached",
    food: true,
    parking: true,
    verified: true,
    amenities: ["Wi-Fi", "AC", "Attached Bathroom", "Power Backup", "Parking", "Food"],
    images: [room1, room6, room3, room4],
    distance: "1.2 km from Lulu Mall",
    available: "Available from 1 Oct 2026",
    description:
      "A bright, fully furnished room in a well-maintained family building in Vibhuti Khand, Gomti Nagar. Ideal for working professionals — walking distance to cafes, markets and the metro feeder stop. Includes a double bed, wardrobe, study table, AC and an attached bathroom with 24x7 water supply.",
    nearby: [
      { name: "Lulu Mall", distance: "1.2 km" },
      { name: "Gomti Nagar Metro Feeder", distance: "600 m" },
      { name: "Medanta Hospital", distance: "2.4 km" },
      { name: "Amity University", distance: "5.1 km" },
    ],
    landlord: landlords[0],
    reviewList: reviewPool[0],
    coords: { top: "28%", left: "34%" },
  },
  {
    id: "lko-hazratganj-02",
    title: "Premium Studio near Hazratganj Market",
    area: "Hazratganj",
    city: "Lucknow",
    rent: 15000,
    deposit: 30000,
    rating: 4.9,
    reviews: 41,
    roomType: "Studio",
    furnished: "Fully Furnished",
    occupancy: "Single / Couple",
    gender: "Any",
    bathroom: "Attached",
    food: false,
    parking: true,
    verified: true,
    amenities: ["Wi-Fi", "AC", "Kitchen", "Washing Machine", "Power Backup", "Parking"],
    images: [room4, room1, room3, room6],
    distance: "400 m from Hazratganj Metro",
    available: "Available immediately",
    description:
      "A premium studio apartment right in the heart of Hazratganj. Comes with a modular kitchenette, washing machine, split AC and a dedicated parking slot. Perfect for professionals who want the city centre at their doorstep.",
    nearby: [
      { name: "Hazratganj Metro", distance: "400 m" },
      { name: "Sahara Ganj Mall", distance: "1.8 km" },
      { name: "Lucknow University", distance: "3.2 km" },
      { name: "Charbagh Railway Station", distance: "4.6 km" },
    ],
    landlord: landlords[1],
    reviewList: reviewPool[1],
    coords: { top: "52%", left: "22%" },
  },
  {
    id: "lko-aliganj-03",
    title: "Shared Room for Students in Aliganj",
    area: "Aliganj",
    city: "Lucknow",
    rent: 5000,
    deposit: 8000,
    rating: 4.5,
    reviews: 18,
    roomType: "Shared Room",
    furnished: "Semi Furnished",
    occupancy: "Двое — 2 sharing",
    gender: "Male",
    bathroom: "Shared",
    food: true,
    parking: false,
    verified: true,
    amenities: ["Wi-Fi", "Food", "Power Backup", "Shared Bathroom"],
    images: [room2, room5, room1, room3],
    distance: "900 m from Kapoorthala",
    available: "Available from 15 Sep 2026",
    description:
      "Budget friendly 2-sharing room for students near Kapoorthala crossing, Aliganj. Includes homely vegetarian meals twice a day, study table per bed and high-speed Wi-Fi. Quiet building with a student-only floor.",
    nearby: [
      { name: "Kapoorthala Market", distance: "900 m" },
      { name: "IT College", distance: "1.5 km" },
      { name: "Bhootnath Market", distance: "3.4 km" },
      { name: "KGMU", distance: "5.8 km" },
    ],
    landlord: landlords[2],
    reviewList: reviewPool[0],
    coords: { top: "20%", left: "62%" },
  },
  {
    id: "lko-indiranagar-04",
    title: "Spacious 1 BHK in Indira Nagar",
    area: "Indira Nagar",
    city: "Lucknow",
    rent: 12500,
    deposit: 25000,
    rating: 4.7,
    reviews: 31,
    roomType: "1 BHK",
    furnished: "Semi Furnished",
    occupancy: "Family / 2 sharing",
    gender: "Any",
    bathroom: "Attached",
    food: false,
    parking: true,
    verified: true,
    amenities: ["Wi-Fi", "Kitchen", "Parking", "Power Backup", "Washing Machine"],
    images: [room3, room6, room4, room1],
    distance: "1.6 km from Bhootnath Market",
    available: "Available from 5 Oct 2026",
    description:
      "Independent 1 BHK on the first floor of a peaceful residential lane in Sector 14, Indira Nagar. Separate entry, modular kitchen, balcony and covered two-wheeler parking. Owner lives on the ground floor.",
    nearby: [
      { name: "Bhootnath Market", distance: "1.6 km" },
      { name: "Indira Nagar Metro Feeder", distance: "700 m" },
      { name: "Ram Manohar Lohia Hospital", distance: "3.9 km" },
      { name: "Phoenix Palassio", distance: "6.2 km" },
    ],
    landlord: landlords[0],
    reviewList: reviewPool[1],
    coords: { top: "62%", left: "58%" },
  },
  {
    id: "lko-jankipuram-05",
    title: "Girls PG with Meals in Jankipuram",
    area: "Jankipuram",
    city: "Lucknow",
    rent: 8000,
    deposit: 12000,
    rating: 4.6,
    reviews: 27,
    roomType: "PG",
    furnished: "Fully Furnished",
    occupancy: "Single occupancy",
    gender: "Female",
    bathroom: "Attached",
    food: true,
    parking: false,
    verified: true,
    amenities: ["Wi-Fi", "AC", "Food", "Washing Machine", "Power Backup"],
    images: [room5, room2, room1, room4],
    distance: "1.1 km from Engineering College Chauraha",
    available: "Available immediately",
    description:
      "Safe, women-only PG in Jankipuram Extension with biometric entry, CCTV and a resident warden. Rent includes three meals, laundry twice a week and housekeeping. Close to coaching hubs and the engineering college.",
    nearby: [
      { name: "Engineering College Chauraha", distance: "1.1 km" },
      { name: "Integral University", distance: "4.3 km" },
      { name: "Jankipuram Market", distance: "800 m" },
      { name: "SGPGI", distance: "12 km" },
    ],
    landlord: landlords[1],
    reviewList: reviewPool[1],
    coords: { top: "38%", left: "76%" },
  },
  {
    id: "lko-alambagh-06",
    title: "Budget Single Room in Alambagh",
    area: "Alambagh",
    city: "Lucknow",
    rent: 6500,
    deposit: 10000,
    rating: 4.3,
    reviews: 12,
    roomType: "Single Room",
    furnished: "Semi Furnished",
    occupancy: "Single occupancy",
    gender: "Any",
    bathroom: "Attached",
    food: false,
    parking: true,
    verified: false,
    amenities: ["Wi-Fi", "Parking", "Attached Bathroom"],
    images: [room1, room2, room5, room3],
    distance: "700 m from Alambagh Bus Station",
    available: "Available from 20 Sep 2026",
    description:
      "Simple and clean single room close to Alambagh bus station and metro. Great for someone who travels often — metro, bus terminal and Charbagh are all minutes away.",
    nearby: [
      { name: "Alambagh Bus Station", distance: "700 m" },
      { name: "Alambagh Metro", distance: "1.0 km" },
      { name: "Charbagh Station", distance: "3.5 km" },
      { name: "Awadh Hospital", distance: "2.1 km" },
    ],
    landlord: landlords[2],
    reviewList: reviewPool[0],
    coords: { top: "74%", left: "36%" },
  },
];

export function getProperty(id: string) {
  return PROPERTIES.find((p) => p.id === id);
}

export const formatINR = (n: number) => "₹" + n.toLocaleString("en-IN");
export const shortINR = (n: number) => "₹" + Math.round(n / 1000) + "K";

export const ROOM_TYPES = ["Any type", "Single Room", "Shared Room", "PG", "Studio", "1 BHK", "2 BHK"];
export const AMENITY_LIST = [
  "Wi-Fi",
  "AC",
  "Parking",
  "Kitchen",
  "Attached Bathroom",
  "Washing Machine",
  "Power Backup",
  "Food",
];
