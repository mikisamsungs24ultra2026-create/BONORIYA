# BONORIYA Authentication Guide

## Overview

The BONORIYA platform now has a complete authentication system with email validation, password security, and welcome emails for all user types: **Admin**, **Guests**, and **Partners**.

## Features Implemented

### 1. Admin Authentication (`/admin`)

**Default Credentials:**
- Email: `admin@bonoriya.com`
- Password: `Bonoriya@2026`

**Features:**
- ✅ Proper login validation with email and password
- ✅ Password reset functionality with email verification
- ✅ 6-digit reset code sent to admin email
- ✅ Logout button (top-right corner when logged in)
- ✅ Secure password requirements (minimum 8 characters)
- ✅ Error messages for invalid credentials

**Password Reset Flow:**
1. Click "Forgot Password?" on login page
2. Enter admin email (admin@bonoriya.com)
3. Receive 6-digit reset code (check browser console for demo)
4. Enter code to verify
5. Set new password
6. Login with new credentials

### 2. Guest Authentication (Book Stays Page)

**Features:**
- ✅ Sign Up with full validation
- ✅ Sign In with email/password
- ✅ Email validation (proper format required)
- ✅ Password strength indicator (Weak/Medium/Strong)
- ✅ Password requirements: Min 8 chars, uppercase, lowercase, number
- ✅ Welcome email sent after registration
- ✅ Error messages for invalid inputs
- ✅ Success messages for completed actions

**Sign Up Fields:**
- Full Name (required)
- Email (validated)
- Phone Number (min 10 digits)
- Password (with strength indicator)
- Confirm Password (must match)
- Terms & Conditions checkbox

**Welcome Email:**
Guests receive a welcome email with:
- Confirmation of successful registration
- Link to start booking properties
- Contact information

### 3. Partner Authentication (Partner Login Page)

**Features:**
- ✅ New Registration with validation
- ✅ Partner Login with approval check
- ✅ Email validation
- ✅ Password strength indicator
- ✅ GST Number field (optional)
- ✅ Admin approval required before login
- ✅ Welcome email sent after registration
- ✅ Approval pending notification

**Registration Fields:**
- Partner Name (required)
- Address (required)
- Business Name (required)
- Email (validated)
- Mobile Number (min 10 digits)
- GST Number (optional)
- Password (with strength indicator)
- Confirm Password (must match)

**Welcome Email:**
Partners receive a welcome email with:
- Confirmation of registration
- Note about 24-48 hour approval period
- What to expect after approval
- Contact information

**Approval Process:**
1. Partner registers
2. Registration stored with `approved: false`
3. Partner receives welcome email
4. Admin reviews and approves
5. Partner can login after approval

## Password Requirements

All passwords must meet these criteria:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

**Password Strength Levels:**
- **Weak**: Basic requirements only
- **Medium**: Requirements + special characters or length
- **Strong**: All requirements + 12+ characters + special characters

## Data Storage

**Note:** This is a demo/frontend application. All data is stored in **localStorage** for demonstration purposes.

### LocalStorage Keys:
- `bonoriya_admin` - Admin account details
- `bonoriya_guests` - Guest accounts array
- `bonoriya_partners` - Partner accounts array
- `bonoriya_email_logs` - Email send history

### Production Recommendations:
For production deployment, replace localStorage with:
- Secure backend database (PostgreSQL, MySQL, MongoDB)
- JWT authentication tokens
- Encrypted password storage (bcrypt)
- Real email service (SendGrid, AWS SES, Mailgun)
- OAuth integration for social login

## Email Notifications

All emails are currently simulated and logged to:
1. **Browser Console** - Full email content displayed
2. **LocalStorage** - `bonoriya_email_logs` for audit trail

### Email Types:

**Guest Welcome Email:**
```
Subject: Welcome to BONORIYA - Your Journey Begins!
Content: Welcome message, features, contact info
```

**Partner Welcome Email:**
```
Subject: Welcome to BONORIYA Partner Network!
Content: Registration confirmation, approval timeline, next steps
```

**Password Reset Email:**
```
Subject: BONORIYA - Password Reset Request
Content: 6-digit reset code, expiry information
```

## Testing the System

### Test Admin Login:
1. Go to `/admin`
2. Use credentials: `admin@bonoriya.com` / `Bonoriya@2026`
3. Click "Sign In to Admin Panel"
4. View admin dashboard
5. Click "Logout" button (top-right)

### Test Password Reset:
1. Go to `/admin`
2. Click "Forgot Password?"
3. Enter: `admin@bonoriya.com`
4. Check browser console for 6-digit code
5. Enter code and set new password
6. Login with new password

### Test Guest Registration:
1. Go to "Book Stays" page
2. Click "Sign Up" tab
3. Fill in all fields with valid data
4. Use a strong password (check strength indicator)
5. Check browser console for welcome email
6. Switch to "Sign In" and login

### Test Partner Registration:
1. Go to "Partner Login" page
2. Click "New Registration" tab
3. Fill in all fields including GST (optional)
4. Use a strong password
5. Check browser console for welcome email
6. Note: Login will show "pending approval" message

## Security Considerations

### Current Implementation (Demo):
- Passwords stored in localStorage (NOT secure)
- Email validation is client-side only
- No rate limiting on login attempts
- No CSRF protection
- No session management

### Production Requirements:
1. **Backend Authentication**
   - Implement server-side validation
   - Use bcrypt for password hashing
   - JWT tokens for session management
   - Refresh token rotation

2. **Email Service**
   - Integrate SendGrid/AWS SES
   - Email verification links
   - Password reset with expiry
   - Email templates

3. **Security Enhancements**
   - Rate limiting (max 5 login attempts)
   - CAPTCHA on login forms
   - Two-factor authentication (2FA)
   - IP-based blocking
   - HTTPS only

4. **Database**
   - Separate tables for users/partners/admins
   - Encrypted sensitive data
   - Audit logs for all logins
   - Role-based access control (RBAC)

## API Integration (For Production)

### Recommended Endpoints:

```javascript
// Admin
POST /api/admin/login
POST /api/admin/reset-password
POST /api/admin/verify-code

// Guest
POST /api/guest/register
POST /api/guest/login
GET /api/guest/profile

// Partner
POST /api/partner/register
POST /api/partner/login
GET /api/partner/status
PUT /api/partner/approve (admin only)

// Email
POST /api/email/send-welcome
POST /api/email/send-reset-code
```

## Troubleshooting

### "Email already registered"
- The email exists in localStorage
- Clear localStorage: `localStorage.clear()` in browser console
- Or use a different email

### "Invalid credentials"
- Check email/password are correct
- Passwords are case-sensitive
- For admin: use default credentials

### "Pending approval" (Partners)
- Normal behavior for new partner registrations
- In demo: manually approve in localStorage
- In production: admin approves via dashboard

### Email not received
- Check browser console for email log
- Check `bonoriya_email_logs` in localStorage
- In production: check email service logs

## Developer Notes

### File Structure:
```
src/app/
├── utils/
│   └── auth.ts                    # Authentication utilities
├── components/
│   ├── AdminLogin.tsx             # Admin login/reset
│   ├── BookStays.tsx              # Guest auth forms
│   └── PartnerLogin.tsx           # Partner auth forms
```

### Key Functions (`auth.ts`):
- `isValidEmail(email)` - Email format validation
- `isValidPassword(password)` - Password strength check
- `registerGuest(...)` - Guest registration
- `validateGuestLogin(...)` - Guest login check
- `registerPartner(...)` - Partner registration
- `validatePartnerLogin(...)` - Partner login check
- `validateAdminLogin(...)` - Admin login check
- `sendWelcomeEmail(...)` - Email simulation
- `resetAdminPassword(...)` - Password reset

## Contact & Support

For questions or issues:
- Email: info@bonoriya.com
- Phone: +91-9864282966, +91-9435855559

---

**Last Updated:** June 2026
**Version:** 1.0.0
