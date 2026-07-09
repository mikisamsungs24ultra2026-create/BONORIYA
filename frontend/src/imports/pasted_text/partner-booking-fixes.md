Partner Room Management & Admin Booking Reports – Critical Functional Fixes
A. Partner Login → Add Rooms Feature Not Working Properly
Current Issue:
The complete room management module under Partner Login is partially broken and multiple features are not functioning correctly.
This is affecting:
Room creation
Room updates
Room photos
Room inventory
Room availability
Main property image display
Immediate fixes required.
1. Room Details Not Reflecting in Book Stays Page
Current Issue:
Partner updates room details successfully in Partner Login.
However, updated room details are NOT visible in:
Book Stays → Property → View Rooms
Required Fix:
Whenever partner updates:
Room Name
Room Type
Room Description
Room Price
Max Occupancy
Amenities
Data must sync instantly to:
Book Stays Page
Room Details Page
Guest Booking Flow
Validation:
✓ Room updates visible in Book Stays
✓ Real-time sync working
2. Save Option Not Working Properly
Current Issue:
Save functionality is unreliable for:
Rooms
Property details
Sometimes updates are not saved.
Required Fix:
Fix Save functionality completely.
When partner clicks: Save
System must:
Validate data
Save to database
Sync changes everywhere
Show confirmation message:
SAVED SUCCESSFULLY
Applicable for:
Property details
Room details
Room updates
Photo uploads
3. Room Photo Upload System Not Working
Current Issues:
Photo upload not working properly
Uploaded photos not saving
Photos not syncing to Book Stays page
Required Fix:
Make room photo upload fully functional.
Requirements:
Multiple photo upload
Preview photos
Delete photo
Replace photo
Save permanently in database/storage
Supported formats:
JPG
JPEG
PNG
WEBP
Max size:
3 MB
Storage:
Supabase Storage or
MilesWeb server storage
NOT localStorage.
4. No Save Option After Adding Room Photos
Current Issue:
After uploading room photos, no Save option appears.
Required Fix:
After photo upload provide:
Buttons:
Save
Cancel
When Save clicked:
Store photos in storage
Save photo URLs in database
Sync to guest pages
Show confirmation: SAVED SUCCESSFULLY
5. Room Photo Tags Getting Mismatched
Current Issue:
Photo tags are getting incorrectly mapped.
Example:
Bathroom photo tagged as Balcony
Bed photo tagged as TV
This creates wrong room display.
Required Fix:
Each uploaded photo must correctly map to selected tag/category.
Example tags:
Bed
TV
Bathroom
Balcony
AC
Wardrobe
View
Other
Photo tag must remain permanently linked to that photo.
6. Set as Main Image Not Working
Current Issue:
When partner selects:
Set as Main Image
Selected image is not appearing as main property image.
Not showing in:
Homepage
Book Stays
Our Properties
Required Fix:
Selected main image must display everywhere as primary property image.
Pages:
Homepage
Our Properties
Book Stays Search Results
Property Details Page
Rules:
Only one main image per property
New selection replaces previous one
B. Inventory Auto-Update Logic Required
7. Automatic Room Inventory Adjustment
Current Issue:
Inventory is not auto-adjusting after booking/cancellation.
Example: Room Category = Deluxe Room
Total Rooms = 2
If 1 room booked: Available Rooms should become: 1
If booking cancelled: Available Rooms should become: 2
This is not happening.
Required Logic:
Available Rooms Formula:
Available Rooms = Total Rooms - Active Confirmed Bookings
Exclude:
Cancelled bookings
Rejected bookings
Include:
Confirmed bookings
Active bookings
Inventory must auto-update in real time.
Example:
Total Deluxe Rooms = 2
Booking 1 confirmed
Available = 1
Booking cancelled
Available = 2
Validation:
✓ Booking reduces inventory
✓ Cancellation restores inventory
✓ Real-time sync works
C. Partner Login → Availability Section Fix
8. Manual Room Availability Control Not Working
Current Issue:
Availability management is not functioning properly.
If room category has multiple rooms, partner cannot properly:
Increase availability
Decrease availability
Block room
Unlock room
Required Fix:
Under:
Partner Login → Availability
Provide room-level availability management.
For each room category show:
Room Type
Total Rooms
Available Rooms
Blocked Rooms
Partner should be able to:
Manual Controls:
Increase availability
Decrease availability
Example: Deluxe Rooms = 5
Manually set available: 3
Block / Unlock Controls
Partner can:
Block selected rooms
Unlock blocked rooms
Example: 5 Deluxe Rooms
Block 2
Available = 3
Unlock 1
Available = 4
Calendar Integration:
Availability should also reflect date-wise in calendar.
D. Admin Dashboard → Booking Reports Fix
9. Cancelled Booking Revenue Adjustment
Current Issue:
When bookings get cancelled, booking reports do not update properly.
Metrics remain unchanged.
This is incorrect.
Required Fix:
If any booking gets cancelled:
Automatically reduce:
Revenue
Commission
Total Guests
Booking Count
Move booking to: Cancelled Category
Required Logic:
Example: Before cancellation:
Total Revenue = ₹100,000
Commission = ₹15,000
Total Guests = 50
Total Bookings = 20
Booking cancelled:
Booking Value = ₹10,000
Commission = ₹1,500
Guests = 3
After cancellation:
Total Revenue = ₹90,000
Commission = ₹13,500
Total Guests = 47
Total Bookings = 19
Cancelled booking should now appear under:
Cancelled Bookings
Validation Requirements
✓ Room details sync to Book Stays
✓ Save option works everywhere
✓ Room photo upload works
✓ Save option visible after upload
✓ Photo tags map correctly
✓ Main image displays correctly
✓ Inventory auto-adjusts on booking
✓ Inventory restores on cancellation
✓ Manual availability control works
✓ Block/unlock works
✓ Cancelled bookings reduce revenue automatically
✓ Booking reports remain accurate in real time