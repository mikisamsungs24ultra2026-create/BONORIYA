12. Book Stays Page & Homepage – Property Search, Booking Workflow & Live Partner Property Integration

---

A. Show Only Partner Properties in Book Stays

Current Issue:

Book Stays page is currently displaying many demo/sample properties that are not actual partner properties.

Required Fix:

Only display properties that are registered under:

Admin Dashboard → Partner Properties

Remove all:

- Demo Properties
- Sample Properties
- Hardcoded Properties
- Test Listings

Requirements:

- Guest should only see active live partner properties.
- Property list must be dynamically fetched from Admin Dashboard partner property database.

Applicable in:

- Book Stays page
- Guest dashboard
- Search results
- Homepage property display

---

B. Smart Location & Property Search

Applicable in:

- Book Stays Page
- Homepage Search Bar

Required Enhancement:

Search should support both:

1. Location Search via Google Maps

Example:
If guest types:

- Shil

Search suggestions should automatically show:

- Shillong

using Google Maps autocomplete.

Examples:

- Guwa → Guwahati
- Del → Delhi
- Aga → Agartala

---

2. Property Name Search

If guest searches by property name:

Example:
Typing:

- Bon
- Eco
- Stay

Search should instantly show matching properties from:

Admin Dashboard → Partner Properties

based on initial letters while typing.

Example:

- Bonoriya Agro Eco Tourism
- Bonoriya Hills Stay

Functional Requirements:

- Live search suggestions
- Fast autocomplete
- Support location search + property search
- Only search live partner properties

---

C. Location-Based Property Display

Required Behavior:

When guest selects a location:

Show only partner properties registered in that location.

Example:
Location selected:

Shillong

Display only Shillong properties.

Property Grid Requirements:

Display in grid view:

- Main Property Image (Set as Main Image)
- Property Name
- Location
- Ratings
- Starting Price
- Availability Status

Important:
The image selected under:

Partner Login → Photos → Set as Main Image

must be displayed as property card image.

---

D. Guest Sign-In Property Filtering

Current Issue:

Even after guest signs in, Book Stays page still shows demo properties.

Required Fix:

After guest login:

Show only:

- Active partner properties from Admin Dashboard

Remove all demo/sample properties completely.

---

E. Property Selection Workflow Redesign

Current Issue:

After property selection, system directly shows room details.

This is incorrect.

Required Workflow:

Step 1 – Guest Searches Property

Search by:

- Location
  or
- Property Name

---

Step 2 – Property Selection

After selecting property, show complete property overview first.

Display:

- Property Name
- Property Description
- Ratings
- Location
- Amenities
- Overall Property Images
- Contact Information
- Check-In / Check-Out Rules

Do NOT show rooms immediately.

---

Step 3 – Select Rooms Button

Show a button:

SELECT ROOMS

Upon clicking this button, show all room categories added by partner.

---

Step 4 – Room Listing

Display all room types for selected property.

For each room show:

- Room Type
- Room Price
- Max Occupancy
- Availability
- Room Thumbnail

Availability logic:

If available:
Show normal booking option.

If sold out:
Show message:

Sorry, you missed it!

---

Step 5 – Room Details

After guest selects a room:

Show full room details.

Display:

- Room Description
- Room Images
- Room Amenities
- Max Occupancy
- Bed Type
- Bathroom
- AC / Non-AC
- Balcony/View
- WiFi

All data should come from partner dashboard.

---

F. Occupancy-Based Room Matching & Booking Flow

Required Logic:

When guest enters:

- Number of Adults
- Number of Children
- Total Guests

System should only show rooms matching occupancy requirements.

Example:
Guest Count = 4

Show only rooms that can accommodate 4 guests.

Hide all non-matching rooms.

---

Booking Confirmation Workflow

If room is selected and available:

Collect visitor details.

Retrieve automatically from guest account:

- Name
- Phone Number
- Email ID
- Address

Guest must additionally enter for all visitors:

- Visitor Name
- Age
- Sex

for each guest.

Example:
Guest 1:

- Name
- Age
- Sex

Guest 2:

- Name
- Age
- Sex

etc.

---

Final Booking Action

After booking confirmation:

System should:

1. Save booking in database
2. Send booking confirmation email to guest
3. Send booking notification to partner
4. Send booking notification to Bonoriya admin

Sender email:

admin@bonoriya.com

---

Real-Time Sync Requirements

Booking data must instantly reflect in:

- Guest Dashboard
- Partner Login Dashboard
- Admin Dashboard

All booking updates must happen in real time.

---

G. Homepage – Our Properties Random Shuffle

Location:

Bonoriya Homepage → Our Properties

Required Enhancement:

Currently fixed properties are displayed.

Change this behavior.

Required Logic:

Display 3 properties randomly selected from:

Admin Dashboard → Partner Properties

Behavior:

- Randomly shuffle properties periodically
  OR
- Shuffle on page refresh

Requirements:

Each property card should display:

- Main Property Image
- Property Name
- Location
- Rating

Only active partner properties should be used.

Remove all demo/sample property cards.