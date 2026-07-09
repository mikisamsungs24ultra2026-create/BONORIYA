16. Partner Image Sync, Room Photo Visibility, WhatsApp Notifications & Complete Supabase Real-Time Sync

---

A. Partner Login → Main Property Image Still Not Working

Current Issue:

Under Partner Login → Photos

When partner selects:

Set as Main Image

the selected image is still NOT appearing as property main image.

Instead, system is displaying:

- Random demo images
- Old placeholder images

This is incorrect.

---

Required Fix:

Remove all demo property images permanently from:

- Homepage
- My Properties
- Search Results
- Book Stays page

Main property image must ONLY come from partner uploaded property photos.

---

Required Logic:

If partner selects:
Set as Main Image

That exact selected image must become primary property image everywhere.

Display in:

- Homepage
- Our Properties
- My Properties
- Search Results
- Book Stays page
- Property Details Page

Rules:

- One property = one main image
- New main image overrides old main image
- No demo image fallback if real property image exists

---

Validation:

✓ Main image visible everywhere
✓ Demo images removed
✓ Selected image displayed correctly

---

B. Partner Login → Uploaded Room Photos Not Visible After Save

Current Issue:

After partner uploads room photos and clicks Save:

- Photos disappear
- Uploaded photos are not visible to partner

Partner cannot verify:

- Which images are uploaded
- Which images are pending

This creates confusion.

---

Required Fix:

After room photo upload and save:
Uploaded room photos must remain visible inside Partner Login.

Display:

- Thumbnail gallery
- Photo tag
- Upload date

Each uploaded image should have:

- Preview
- Edit Tag
- Replace
- Delete

---

Example View:

Deluxe Room Photos:

- Bed.jpg
- Bathroom.jpg
- TV.jpg
- Balcony.jpg

Partner must always be able to view uploaded room images.

---

Validation:

✓ Uploaded room photos visible after save
✓ Partner can identify uploaded photos
✓ Partner can replace/delete photos

---

C. Supabase Sync Failure – Room Details Not Visible on Other Devices

Current Issue:

Room details and room photos updated by partner are visible only on same device.

When logged in from another device:
System shows:
No Rooms Added

This confirms:
Supabase sync is still failing.

This is a critical architecture issue.

---

Root Cause:

Application is still:

- Reading from local cache/localStorage
  OR
- Writing to local cache instead of Supabase

This must be fixed completely.

---

Required Fix:

All room data must save directly to Supabase.

Includes:

- Room Name
- Room Type
- Room Description
- Room Price
- Max Occupancy
- Room Photos
- Room Inventory
- Availability

---

Required Data Flow:

Partner updates room
→ Save to Supabase immediately
→ Sync to all devices immediately

Device 1:
Laptop

Device 2:
Mobile

Device 3:
Tablet

All devices must display identical live data.

---

Validation:

✓ Room data stored in Supabase
✓ Room photos stored in Supabase Storage
✓ Same room visible on all devices
✓ No device-specific data mismatch

---

D. Book Stays Page → Room Photos Not Visible to Guests

Current Issue:

Guests cannot view room photos before booking.

This is a major booking issue.

Guests must see room images before selecting room.

---

Required Fix:

In:
Book Stays → Property → Room Details

Display all room photos uploaded by partner.

---

Required Room Gallery:

Each room should display:

- Main Room Image
- All room photos

Examples:

- Bed
- Bathroom
- TV
- Balcony
- AC
- Wardrobe
- View

Display as:

- Image slider
  OR
- Gallery grid

---

Validation:

✓ Guests can view room photos
✓ Room images load correctly
✓ Photos sync from partner upload

---

E. WhatsApp Notification Integration for Bonoriya Admin

Requirement:

Any critical system event must trigger WhatsApp notification to Bonoriya Admin.

Admin WhatsApp Numbers:

1. +919864282966
2. +919508776404

---

Events That Must Trigger WhatsApp Notification

Booking Events:

- New stay booking
- Booking cancellation
- Booking rejection

---

Partner Events:

- New partner registration
- Partner deletion
- Property addition
- Property deletion

---

Day Trip Events:

- New day trip booking
- Day trip cancellation

---

Required Notification Details

Example:

NEW BOOKING ALERT

Booking ID: BKG-123456
Guest: John Doe
Property: The Stay Corner
Room: Deluxe Room
Guests: 3
Amount: ₹8500

---

Example:

BOOKING CANCELLED

Booking ID: BKG-123456
Guest: John Doe
Property: The Stay Corner

---

Integration Options

Recommended:

- WhatsApp Business API
  OR
- "Twilio WhatsApp API" (https://reference-url-citation.invalid/0)
  OR
- "Meta WhatsApp Business Platform" (https://reference-url-citation.invalid/1)

---

F. MOST CRITICAL REQUIREMENT – Full Real-Time Supabase Sync

Current Major Problem:

Data updated on one device is not appearing on another.

This issue still exists.

This is the highest priority issue.

---

Required Fix:

Any data updated, added or deleted anywhere in BONORIYA must be saved directly in Supabase in real time.

---

Applies To:

Admin:

- Properties
- Photos
- Blogs
- Bookings
- Day trip bookings
- Settings

Partner:

- Property details
- Room details
- Room photos
- Inventory
- Availability

Client / Guest:

- Account details
- Bookings
- Cancellations

---

Mandatory Storage Rule

All business data must be stored in:

- Supabase Database
- Supabase Storage

NOT in:

- localStorage
- browser cache
- session storage

localStorage may only store:

- login session token
- temporary UI state

Nothing else.

---

Required System Behavior

Any change anywhere:

Update
→ Save to Supabase instantly
→ Sync to all devices instantly
→ Retrieve same data everywhere

---

Final Validation Requirements

✓ Main property image works everywhere
✓ Demo images removed completely
✓ Uploaded room photos visible to partner
✓ Room data visible on all devices
✓ Supabase sync works correctly
✓ Guests can view room photos before booking
✓ WhatsApp notifications working
✓ All data stored in Supabase only
✓ Real-time sync across all devices