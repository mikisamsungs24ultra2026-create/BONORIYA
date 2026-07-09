# Prompt for Figma Make — Discount Coupon Management System for Bonoriya Admin Dashboard

Design and implement a professional Discount Coupon Management System for the Bonoriya Admin Dashboard. The system should be modern, user-friendly, scalable, and similar in functionality and appearance to the coupon systems used by leading travel platforms such as MakeMyTrip.

## Objective

Allow Bonoriya administrators to create, manage, activate, deactivate, schedule, and monitor promotional discount coupons for Book Stays and Day Trip bookings.

The system should automatically validate coupon eligibility and apply discounts during checkout.

---

# Default Welcome Coupon

Create a default coupon that is automatically available to every newly registered user.

Coupon Code:
NEWBONORIYA

Coupon Benefits:
• 10% discount
• Applicable only for Book Stays
• Valid on both:
  - Bonoriya Own Properties
  - Associated Properties
• Valid only for the first three (3) successful bookings after a new user signs up.
• Automatically applied when eligible, while also allowing manual entry of the coupon code.

After three successful bookings, the coupon should expire automatically for that user.

---

# Admin Dashboard – Coupon Management

Create a dedicated "Discount Coupons" module in the Admin Dashboard.

The dashboard should allow administrators to:

• Create new coupons
• Edit coupons
• Delete coupons
• Activate or deactivate coupons
• Schedule coupons
• Duplicate existing coupons
• Search coupons
• Filter coupons
• View coupon performance
• Export coupon reports

Display coupons in a professional data table.

Columns should include:

• Coupon Name
• Coupon Code
• Discount Type
• Discount Value
• Booking Type
• Property Type
• Validity
• Usage Limit
• Status
• Total Redemptions
• Created By
• Created Date
• Actions

---

# Coupon Creation Form

The Admin should be able to configure:

Coupon Name

Coupon Code

Coupon Description

Booking Type

Options:
• Book Stays
• Day Trips
• Both

Property Type

Options:
• Bonoriya Own
• Associated
• Both

Discount Type

Options:
• Percentage
• Fixed Amount

Discount Value

Examples:
10%
15%
20%
₹500
₹1000

Minimum Booking Amount

Maximum Discount Amount

Valid From Date

Valid Until Date

Applicable Days

Examples:
• Every Day
• Weekends
• Weekdays
• Festival Dates

Maximum Usage Per User

Maximum Overall Redemptions

Applicable User Type

Options:
• New Users
• Existing Users
• All Users

Coupon Visibility

Options:
• Public
• Private
• Invite Only

Status

• Active
• Scheduled
• Expired
• Disabled

---

# Coupon Display on Booking Pages

When a user is eligible for a coupon:

Display an elegant coupon section above the booking summary.

The design should resemble premium travel websites such as MakeMyTrip.

Show:

Coupon Code

Discount Percentage

Savings Amount

Expiry Date

"Apply Coupon" button

"Coupon Applied Successfully" animation

When applied:

Update the booking summary instantly.

Display:

Original Price

Discount

Final Payable Amount

Savings

Use subtle animations and premium UI.

---

# Rate Chart Integration

If a discount coupon is active:

Display:

Original Price (strikethrough)

↓

Discount Percentage

↓

Discounted Price

↓

Validity Period

Example:

₹5,000
~~₹5,000~~

10% OFF

Now ₹4,500

Offer valid till 31 December 2026

The rate chart should update dynamically based on active coupons.

---

# Automatic Coupon Validation

Before applying a coupon, validate:

• Booking Type
• Property Type
• User Eligibility
• Booking Amount
• Coupon Expiry
• Usage Limit
• First Booking / First Three Bookings
• User Login Status

Display meaningful error messages when conditions are not met.

---

# Coupon Analytics

Provide Admin with analytics including:

• Total Coupons Created

• Active Coupons

• Expired Coupons

• Total Redemptions

• Revenue Generated

• Discount Given

• Most Used Coupon

• Conversion Rate

Display charts and statistics in a clean dashboard.

---

# SEO-Friendly Public Coupon Pages

Create SEO-optimized public landing pages for all public coupons.

Each coupon should have a dedicated URL.

Example:

/offers/newbonoriya

Include:

• Coupon Title
• Discount Details
• Validity
• Terms & Conditions
• Eligible Properties
• CTA to Book Now

Generate SEO-friendly:

• Meta Title
• Meta Description
• Open Graph Tags
• Structured Data (Schema.org Offer)
• Canonical URL
• Clean URL Slug

Ensure coupon pages are crawlable and indexable by search engines so eligible public offers can appear in Google Search results.

---

# Design Style

The entire coupon system should feel:

• Premium
• Elegant
• Modern
• International Standard
• Fast
• Minimal
• Professional

Use:

• Rounded cards
• Premium typography
• Soft shadows
• Smooth animations
• Modern icons
• Consistent Bonoriya branding
• Mobile-first responsive design

---

# Final Goal

Develop a complete enterprise-grade Discount Coupon Management System that enables Bonoriya to create targeted promotional campaigns, reward new and existing customers, increase bookings, improve conversions, and enhance the overall user experience while maintaining a premium brand image comparable to leading online travel platforms.