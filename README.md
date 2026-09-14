# RoomSpace Lucknow

Create a high-fidelity responsive web application called “Room Renter”, an Indian room-rental platform connecting renters with landlords. Make the UX as simple and fast as Uber/Rapido: location-first search, clean cards, minimal steps and obvious CTAs. Do not copy existing brands.

STYLE

Premium modern startup UI. White/light background, modern typography, rounded cards, subtle shadows, generous spacing, high-quality room photos, minimal icons and clear hierarchy. Use teal/green or blue as the main accent with neutral gray tones. Create desktop and mobile designs. Use realistic Indian names, locations and ₹ INR prices.

LOCATION ACCESS

When a new user opens the app for the first time, show a clean location-permission modal before the main experience.

Modal:

“Find rooms near you”

“Allow location access to discover rooms and properties available near your current location.”

Buttons:

“Allow Location”

“Enter Location Manually”

Use a location-pin illustration/icon. Keep the popup friendly and minimal.

If the user allows location, detect their city and check availability.

IMPORTANT: Currently Room Renter is ONLY AVAILABLE IN LUCKNOW.

If the detected/manual city is Lucknow:

Show:

“Rooms available in Lucknow”

and display Lucknow properties.

If the city is not Lucknow:

Show a clear “Coming Soon” state:

“Room Renter is coming soon to your city.”

“Currently, Room Renter is available only in Lucknow. We’re working to bring rooms to your city soon.”

Button:

“Explore Lucknow”

Do not show unavailable-city properties as if they are currently available.

HOME

Header: Room Renter logo, Find a Room, List Your Property, How It Works, Login, Sign Up.

Hero:

“Find a room that feels like home.”

Subtitle:

“Discover verified rooms, flats and shared spaces near your college, workplace or preferred location.”

Large search:

Location, Move-in Date, Budget, Room Type + Search Rooms.

If location is not selected, encourage location access or manual location selection.

AVAILABLE CITIES

Create a city selection section.

Lucknow:

“Available Now” ✓

Other cities:

Delhi — Coming Soon

Noida — Coming Soon

Gurgaon — Coming Soon

Bengaluru — Coming Soon

Mumbai — Coming Soon

Pune — Coming Soon

Hyderabad — Coming Soon

Coming-soon cities should appear visually disabled/muted and should not allow normal room searching.

SUGGESTED ROOMS

Place “Suggested Rooms” at the TOP of the home page immediately below the main search section.

Heading:

“Suggested Rooms for You”

Subtitle:

“Rooms selected based on your location and preferences.”

Show 4–6 attractive room cards before other discovery sections.

Cards should show:

Large photo, title, location, ₹ rent/month, rating, reviews, room type, key amenities, Verified badge and favorite button.

Example:

“Fully Furnished Room in Gomti Nagar”

₹10,000/month

★4.8 (24)

Gomti Nagar, Lucknow

Wi-Fi · AC · Attached Bathroom

“View Details”

For new users with no preferences, suggest popular/high-rated/verified rooms in Lucknow.

SEARCH

Create a property discovery page with listings + interactive map.

Search bar:

Location, Budget, Move-in Date, Room Type.

Filters:

Price, Room Type, Furnished, Bathroom, Food, Parking, Wi-Fi, AC, Gender, Availability, Verified.

Only allow active search results for Lucknow.

Property card:

Large photo, title, location, rent/month, deposit, rating, reviews, room type, amenities, distance, verified badge and favorite button.

Map markers show prices such as ₹5K, ₹8K, ₹10K and ₹15K. Clicking a marker opens its property card.

If user searches another city:

Show Coming Soon instead of property results.

PROPERTY DETAILS

Large image gallery with thumbnails, favorite and share.

Show title, rating, location, monthly rent, deposit, availability, room type, occupancy and gender preference.

Amenities: Wi-Fi, AC, Washing Machine, Kitchen, Parking, Bathroom, Power Backup, Food.

Sections: Description, Map, Nearby Places, Reviews and Landlord.

Landlord card: photo, name, rating, Verified Owner, response rate/time.

Buttons: Contact Owner, Schedule Visit.

After rental approval: Create Rental Agreement.

CHAT & VISITS

Simple renter-landlord chat with property preview, messages and call option.

Quick messages:

“Is this room available?”

“Can I schedule a visit?”

“Any additional charges?”

Visit flow:

Choose date/time → Confirm Visit.

Show upcoming visit with location, cancel and reschedule.

RENTER DASHBOARD

Sidebar:

Overview, Saved Rooms, Applications, Visits, Rental Agreements, Messages, Profile, Settings.

Show:

Suggested Rooms, Recently Viewed, Saved Rooms, Upcoming Visits, Agreements and Messages.

LANDLORD DASHBOARD

Sidebar:

Dashboard, My Properties, Add Property, Enquiries, Visits, Rental Agreements, Messages, Reviews, Profile, Settings.

Stats:

Active Listings, Views, Enquiries, Visits, Applications.

Property cards with photo, rent, views, enquiries and status.

Actions: Edit, Pause, View Enquiries.

ADD PROPERTY

Wizard:

Location → Room Details → Amenities → Photos → Rules → Preview.

Collect:

Address, city, map location, property type, room type, occupancy, furnished status, rent, deposit and availability.

Only allow new listings in currently supported cities. Since Lucknow is the only active city, landlords can currently list properties only in Lucknow.

Amenities:

Wi-Fi, AC, Parking, Kitchen, Bathroom, Washing Machine, Power Backup, Food.

Photo uploader with preview, delete, reorder and cover image.

Rules:

Guests, pets, smoking, noise, subletting, gender preference and custom rules.

Final preview + Publish Property.

RENTAL AGREEMENT

Make Rental Agreement a major feature.

Entry points:

Property details, renter dashboard, landlord dashboard and accepted rental request.

Card:

“Rental Agreement”

“Create a rental agreement with your landlord before moving in.”

Button: Create Agreement.

Wizard:

Details → Terms → Review → Sign.

Auto-fill property address, rent, deposit and move-in date.

Tenant and landlord details:

Name, phone, email, address and ID verification.

Terms:

Rent, deposit, duration, start/end date, due date, notice period, maintenance, electricity, water, parking, late charges and renewal.

House rules and custom clauses.

AGREEMENT PREVIEW

Professional document preview showing landlord, tenant, property, rent, deposit and duration.

Sections:

Parties, Property, Rent, Deposit, Duration, Utilities, Responsibilities, Rules, Notice, Termination, Clauses, Signatures.

Buttons:

Edit, Download PDF, Send for Signature.

Signing timeline:

Created → Tenant Signed → Landlord Signed → Completed.

Success:

“✓ Agreement Signed Successfully”

Show agreement ID, date and validity.

Statuses:

Draft, Waiting for Tenant, Waiting for Landlord, Signed, Expired.

Include:

“Review all terms carefully before signing. Agreement requirements may vary by location.”

REVIEWS & TRUST

Show overall rating, rating breakdown and reviews.

Badges:

Identity Verified, Owner Verified, Property Verified, Verified Renter, Agreement Signed.

NOTIFICATIONS

New messages, visit reminders, rental requests, agreement received/signed, agreement expiry and saved-property updates.

MOBILE

Create mobile versions of Home, Search, Map, Property Details, Chat, Visits, Dashboards, Add Property and Rental Agreement.

Bottom navigation:

Home | Search | Saved | Messages | Profile

Use floating Map button and mobile-friendly agreement signing.

UI STATES

Create polished states for:

No results, no saved rooms, no messages, unavailable property, location permission denied, network error and loading skeletons.

Create a dedicated Coming Soon screen for unsupported cities.

DESIGN SYSTEM

Create reusable buttons, inputs, search bars, filter chips, property cards, ratings, badges, profiles, agreement cards, chat bubbles, notifications, modals, maps, galleries and progress indicators.

CORE JOURNEY

📍 Location Access → 🔎 Find → 🏠 Visit → 🤝 Agree → 📄 Rental Agreement → ✍️ Sign → 🔑 Move In

Make Room Renter feel like a production-ready Indian rental startup, not a traditional real-estate website. Prioritize simplicity, trust, transparency, location-based discovery and fast communication.

IMPORTANT PRODUCT RULE:

Lucknow is the ONLY currently active city. All other cities must display “Coming Soon”. Suggested Rooms must always appear near the TOP of the Home page, directly below the main search/location section.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5cc8d0df-2596-46c7-ac57-b211f705c199).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
