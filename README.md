# Room Renter

A modern Indian room-rental platform connecting renters with landlords. Room Renter is designed to make finding, visiting, and renting a room simple, fast, and transparent.

The UX is inspired by location-first apps such as Uber/Rapido: detect the user's location, show relevant properties, keep the search flow simple, and make important actions obvious.

## Product Overview

Room Renter connects:

- 🧑‍🎓 Room seekers looking for rooms, flats and shared spaces
- 🏠 Landlords listing and managing properties
- 💬 Renters and landlords through direct messaging
- 📅 Users through scheduled property visits
- 📄 Renters and landlords through rental agreements
- ⭐ Users through property and landlord reviews

The platform focuses on:

- Location-based discovery
- Verified properties and landlords
- Transparent rental information
- Fast communication
- Property visits
- Rental agreements
- Responsive mobile and desktop experiences

---

# LOCATION ACCESS

When a new user opens the application for the first time, the application can request location access before showing location-based results.

### Location Permission Modal

**Find rooms near you**

> Allow location access to discover rooms and properties available near your current location.

Options:

- Allow Location
- Enter Location Manually

A location-pin icon/illustration should be used to keep the experience clear and friendly.

### Location Behaviour

If the user allows location access:

1. Detect the user's approximate location.
2. Determine the user's city.
3. Load properties available for that location.
4. Display the selected city throughout the relevant search experience.

If location access is denied:

- Allow the user to manually select a location.
- Do not block the user from using the application.
- Clearly indicate when a location needs to be selected.

The application should not assume a fixed city such as Lucknow.

---

# HOME

Header:

- Room Renter logo
- Find a Room
- List Your Property
- How It Works
- Login
- Sign Up

Hero:

> **Find a room that feels like home.**

Subtitle:

> Discover verified rooms, flats and shared spaces near your college, workplace or preferred location.

Large search:

- Location
- Move-in Date
- Budget
- Room Type
- Search Rooms

If a location is not selected, encourage the user to allow location access or manually select a location.

---

# LOCATION & CITY DISCOVERY

The application should support location-based property discovery.

Users can:

- Detect their current city
- Select a city manually
- Search properties based on location
- See whether properties are available in the selected location

Cities can be added or enabled as the platform expands.

Example cities:

- Delhi
- Noida
- Gurgaon
- Bengaluru
- Mumbai
- Pune
- Hyderabad
- Lucknow

Cities without available listings should display an appropriate **Coming Soon** or **No Properties Available** state rather than showing unrelated properties.

---

# SUGGESTED ROOMS

Place **Suggested Rooms** near the top of the home page immediately below the main search/location section.

Heading:

> **Suggested Rooms for You**

Subtitle:

> Rooms selected based on your location and preferences.

Show 4–6 attractive room cards when suitable properties are available.

Cards should show:

- Large photo
- Title
- Location
- ₹ rent/month
- Rating
- Reviews
- Room type
- Key amenities
- Verified badge
- Favorite button

Example:

**Fully Furnished Room**

₹10,000/month

★ 4.8 (24)

Gomti Nagar, Lucknow

Wi-Fi · AC · Attached Bathroom

**View Details**

For new users without preferences, suggestions can use available properties that are popular, highly rated or verified in the selected location.

---

# SEARCH

Create a property discovery page containing listings and an interactive map.

Search options:

- Location
- Budget
- Move-in Date
- Room Type

Filters:

- Price
- Room Type
- Furnished
- Bathroom
- Food
- Parking
- Wi-Fi
- AC
- Gender
- Availability
- Verified

Property card:

- Large photo
- Title
- Location
- Rent/month
- Deposit
- Rating
- Reviews
- Room type
- Amenities
- Distance
- Verified badge
- Favorite button

Map markers can show prices such as:

- ₹5K
- ₹8K
- ₹10K
- ₹15K

Clicking a map marker should open or highlight the related property card.

If the selected location has no available properties, show a clear empty-state message instead of unrelated listings.

---

# PROPERTY DETAILS

Large image gallery with:

- Thumbnails
- Favorite
- Share

Show:

- Property title
- Rating
- Location
- Monthly rent
- Deposit
- Availability
- Room type
- Occupancy
- Gender preference

Amenities:

- Wi-Fi
- AC
- Washing Machine
- Kitchen
- Parking
- Bathroom
- Power Backup
- Food

Sections:

- Description
- Map
- Nearby Places
- Reviews
- Landlord

Landlord card:

- Photo
- Name
- Rating
- Verified Owner
- Response rate/time

Actions:

- Contact Owner
- Schedule Visit

After rental approval:

**Create Rental Agreement**

---

# CHAT & VISITS

Provide simple renter-landlord communication with:

- Property preview
- Messages
- Call option

Quick messages:

- "Is this room available?"
- "Can I schedule a visit?"
- "Any additional charges?"

### Visit Flow

Choose date/time → Confirm Visit

Show upcoming visits with:

- Property
- Date
- Time
- Location
- Cancel
- Reschedule

---

# RENTER DASHBOARD

Navigation:

- Overview
- Saved Rooms
- Applications
- Visits
- Rental Agreements
- Messages
- Profile
- Settings

Show:

- Suggested Rooms
- Recently Viewed
- Saved Rooms
- Upcoming Visits
- Agreements
- Messages

---

# LANDLORD DASHBOARD

Navigation:

- Dashboard
- My Properties
- Add Property
- Enquiries
- Visits
- Rental Agreements
- Messages
- Reviews
- Profile
- Settings

Stats:

- Active Listings
- Views
- Enquiries
- Visits
- Applications

Property cards should display:

- Photo
- Rent
- Views
- Enquiries
- Status

Actions:

- Edit
- Pause
- View Enquiries

---

# ADD PROPERTY

Use a multi-step wizard:

**Location → Room Details → Amenities → Photos → Rules → Preview**

Collect:

- Address
- City
- Map location
- Property type
- Room type
- Occupancy
- Furnished status
- Rent
- Deposit
- Availability

Properties should only be published in locations supported by the application's current property availability rules.

### Amenities

- Wi-Fi
- AC
- Parking
- Kitchen
- Bathroom
- Washing Machine
- Power Backup
- Food

### Photo Uploader

Support:

- Preview
- Delete
- Reorder
- Cover image

### Rules

- Guests
- Pets
- Smoking
- Noise
- Subletting
- Gender preference
- Custom rules

Final step:

**Preview → Publish Property**

---

# RENTAL AGREEMENT

Make Rental Agreement a major feature.

Entry points:

- Property details
- Renter dashboard
- Landlord dashboard
- Accepted rental request

Card:

> **Rental Agreement**

> Create a rental agreement with your landlord before moving in.

Button:

**Create Agreement**

### Agreement Wizard

**Details → Terms → Review → Sign**

Auto-fill:

- Property address
- Rent
- Deposit
- Move-in date

Tenant and landlord details:

- Name
- Phone
- Email
- Address
- ID verification

Terms:

- Rent
- Deposit
- Duration
- Start/end date
- Due date
- Notice period
- Maintenance
- Electricity
- Water
- Parking
- Late charges
- Renewal

Also support:

- House rules
- Custom clauses

---

# AGREEMENT PREVIEW

Provide a professional document preview showing:

- Landlord
- Tenant
- Property
- Rent
- Deposit
- Duration

Sections:

- Parties
- Property
- Rent
- Deposit
- Duration
- Utilities
- Responsibilities
- Rules
- Notice
- Termination
- Clauses
- Signatures

Actions:

- Edit
- Download PDF
- Send for Signature

### Signing Timeline

Created → Tenant Signed → Landlord Signed → Completed

Success state:

> ✓ Agreement Signed Successfully

Show:

- Agreement ID
- Date
- Validity

Statuses:

- Draft
- Waiting for Tenant
- Waiting for Landlord
- Signed
- Expired

Include:

> Review all terms carefully before signing. Agreement requirements may vary by location.

---

# REVIEWS & TRUST

Show:

- Overall rating
- Rating breakdown
- Reviews

Trust badges:

- Identity Verified
- Owner Verified
- Property Verified
- Verified Renter
- Agreement Signed

Reviews should be based on actual user-generated data rather than hardcoded ratings.

---

# NOTIFICATIONS

Support notifications for:

- New messages
- Visit reminders
- Rental requests
- Agreement received
- Agreement signed
- Agreement expiry
- Saved-property updates

---

# MOBILE

Create responsive mobile versions of:

- Home
- Search
- Map
- Property Details
- Chat
- Visits
- Renter Dashboard
- Landlord Dashboard
- Add Property
- Rental Agreement

Bottom navigation:

**Home | Search | Saved | Messages | Profile**

Use:

- Floating Map button
- Touch-friendly controls
- Mobile-friendly agreement signing
- Responsive cards and forms

---

# UI STATES

Create polished states for:

- No results
- No saved rooms
- No messages
- Unavailable property
- Location permission denied
- Location not selected
- Network error
- Loading skeletons
- No properties available in selected city

When a city does not currently have listings, provide a clear message and allow the user to select another location.

---

# DESIGN SYSTEM

Create reusable:

- Buttons
- Inputs
- Search bars
- Filter chips
- Property cards
- Ratings
- Badges
- Profiles
- Agreement cards
- Chat bubbles
- Notifications
- Modals
- Maps
- Galleries
- Progress indicators

Design principles:

- Premium modern startup UI
- White/light background
- Modern typography
- Rounded cards
- Subtle shadows
- Generous spacing
- High-quality room photos
- Minimal icons
- Clear hierarchy
- Teal/green or blue accent
- Neutral gray tones
- Responsive desktop and mobile layouts
- Realistic Indian names, locations and ₹ INR prices

---

# CORE JOURNEY

📍 **Location Access**

↓

🔎 **Find**

↓

🏠 **Visit**

↓

🤝 **Agree**

↓

📄 **Rental Agreement**

↓

✍️ **Sign**

↓

🔑 **Move In**

---

# PRODUCT PRINCIPLES

Room Renter should feel like a production-ready Indian rental startup rather than a traditional real-estate website.

Prioritize:

- Simplicity
- Trust
- Transparency
- Location-based discovery
- Fast communication
- Verified users and properties
- Responsive design
- Secure interactions

The application should dynamically adapt its property discovery experience according to the user's selected or detected location rather than relying on a hardcoded city.

---

# TECHNOLOGY

The project is built as a modern web application using technologies including:

- React
- TypeScript
- TanStack Router / Start
- Supabase
- Tailwind CSS
- Leaflet / OpenStreetMap
- Vite
- Git & GitHub

---

# DEVELOPMENT

## Prerequisites

You need Node.js and npm installed.

Clone the repository:

```sh
git clone <this-repository-url>

cd <repository-name>

npm install