# Prompt for Figma Make — Audit & Validate Discount Coupon System with Supabase Integration

Perform a complete technical and functional audit of the Bonoriya Discount Coupon System, including its integration with Supabase. Verify that the entire coupon module is fully connected, synchronized, secure, and operational across the Admin Dashboard, customer booking flow, and Supabase database.

## Objective

Ensure that the Discount Coupon Management System is fully functional end-to-end, with all coupon data being correctly stored, retrieved, updated, validated, and synchronized with Supabase.

---

## Supabase Database Audit

Verify that:

- All coupon records are stored in Supabase.
- Existing coupons are correctly retrieved from Supabase.
- Newly created coupons are immediately saved to Supabase.
- Edited coupons update the corresponding Supabase records.
- Deleted coupons are removed (or soft-deleted if implemented) from Supabase.
- Coupon status changes (Active, Scheduled, Disabled, Expired) are correctly updated in Supabase.
- All database operations are error-free and use proper validation.
- Database schema supports future scalability.

If any database tables, relationships, indexes, constraints, or fields are missing or incorrect, create or correct them.

---

## Admin Dashboard Audit

Verify that administrators can:

- Create new coupons
- Edit existing coupons
- Delete coupons
- Activate or deactivate coupons
- Schedule coupons
- Search coupons
- Filter coupons
- Duplicate coupons
- View coupon analytics

Every action should instantly synchronize with Supabase without requiring a page refresh.

---

## CRUD Validation

Verify complete CRUD functionality:

Create
- Saves successfully to Supabase.

Read
- Retrieves live coupon data from Supabase.

Update
- Updates Supabase immediately.

Delete
- Removes or archives the coupon correctly.

---

## Booking Flow Validation

Verify that coupons retrieved from Supabase are correctly applied during booking.

Check:

- Book Stay bookings
- Day Trip bookings
- Bonoriya Own properties
- Associated properties

Ensure discounts are calculated correctly and reflected in:

- Booking Summary
- Existing Rate Chart
- Final Payable Amount
- Discount Breakdown

---

## Default Coupon Validation

Verify that the default coupon:

NEWBONORIYA

Works correctly.

Confirm:

- Automatically assigned to newly registered users.
- 10% discount applied.
- Valid only for Book Stays.
- Valid for Bonoriya Own and Associated Properties.
- Limited to the first three successful bookings.
- Automatically expires after the third eligible booking.

---

## Coupon Validation Logic

Audit all validation rules, including:

- Coupon expiry
- Start date
- End date
- Booking type
- Property type
- User eligibility
- Usage limit per user
- Overall usage limit
- Minimum booking value
- Maximum discount
- Active/Inactive status

Reject invalid coupons with clear error messages.

---

## UI Synchronization

Verify that all coupon information displayed on the website is retrieved dynamically from Supabase.

This includes:

- Coupon code
- Discount percentage
- Discount amount
- Validity period
- Coupon banners
- Offer cards
- Booking page coupon section
- Rate chart discounts

No hardcoded coupon values should exist.

---

## Analytics Audit

Verify analytics update automatically after every coupon redemption.

Check:

- Total coupons
- Active coupons
- Expired coupons
- Total redemptions
- Revenue impact
- Discount value issued
- Most used coupons

Analytics should always reflect live Supabase data.

---

## Security Audit

Verify:

- Row Level Security (RLS) policies are correctly configured.
- Only authorized administrators can create, edit, or delete coupons.
- Customers can only view and redeem eligible coupons.
- Coupon validation cannot be bypassed through frontend manipulation.
- Prevent duplicate coupon redemption where restricted.

---

## Performance Audit

Ensure:

- Efficient database queries.
- Proper indexing.
- Fast loading of coupon data.
- No duplicate database calls.
- Minimal API latency.
- Graceful handling of network or database errors.

---

## Error Handling

If any Supabase query, API call, database schema, or business logic is incomplete or incorrect:

- Identify the issue.
- Automatically correct it where possible.
- Ensure all frontend and backend logic remains synchronized.
- Prevent broken coupon functionality.

---

## Final Verification

Confirm that:

✅ Coupons are fully managed from the Admin Dashboard.
✅ Every coupon is stored and maintained in Supabase.
✅ Newly created coupons immediately appear across the website.
✅ Coupon updates synchronize in real time.
✅ Coupon deletion is reflected throughout the platform.
✅ Booking calculations use live coupon data from Supabase.
✅ All coupon features work reliably without manual intervention.

Perform a complete end-to-end audit and resolve any issues so the Discount Coupon Management System is production-ready, fully synchronized with Supabase, secure, scalable, and operating flawlessly.