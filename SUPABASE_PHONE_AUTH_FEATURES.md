# Gully United XLV Supabase Phone Authentication Specification

This document defines the complete phone-number and password authentication feature for the later Next.js + Supabase implementation. It covers registration, login, forgot password, reset password, password update, sessions, security, accessibility, user messages, and tests.

Do not implement this inside the current in-memory prototype. Implement it as a dedicated Next.js App Router and Supabase phase using `@supabase/ssr`.

## 1. Authentication scope

The system must support:

- Create an account with Indian phone number and password.
- Optional display name during registration.
- Phone verification by OTP before the account becomes fully active, if enabled in the approved Supabase Auth configuration.
- Login with phone number and password.
- Logout from the current device.
- Forgot password using phone number and OTP or the approved Supabase recovery flow.
- Reset password after successful recovery verification.
- Change password while authenticated.
- View a safe account/profile page.
- Refresh sessions securely through server-managed cookies.
- Protect customer booking history and account operations.
- Friendly, accessible validation and error messages.

Email/password login is out of scope unless separately approved. Do not silently add social login, magic links, or guest-to-account conversion.

## 2. Required project architecture

Use pragmatic Clean/Hexagonal Architecture and SOLID principles:

- **Domain:** phone normalization, password policy, auth state, and typed error codes.
- **Application:** `RegisterUser`, `VerifyPhone`, `LoginUser`, `RequestPasswordReset`, `VerifyPasswordReset`, `ResetPassword`, `ChangePassword`, `GetCurrentUser`, and `LogoutUser` use cases.
- **Infrastructure:** Supabase browser client, Supabase server client, middleware session refresh, profile repository, rate limiter, audit logger, and OTP/recovery provider adapter.
- **Transport:** Next.js route handlers or server actions that validate input, call one use case, and map typed errors to HTTP responses.
- **UI:** client components for forms and interaction only. UI must never directly contain service-role keys or perform authorization decisions.

Use focused ports where needed:

- `AuthGateway`
- `ProfileRepository`
- `RateLimiter`
- `AuditLogger`
- `Clock`
- `IdGenerator`

Do not scatter Supabase calls across React components. Do not use a service locator or global mutable auth state.

## 3. Supabase Auth configuration

Configure Supabase Auth with:

- Phone provider enabled.
- OTP verification enabled for registration and recovery according to the approved provider setup.
- Minimum password length and complexity configured consistently with the application policy.
- Session duration and refresh behavior documented.
- Local, preview, and production redirect URLs configured separately.
- CAPTCHA or provider abuse protection enabled where supported.
- Leaked-password protection enabled where available.
- Secure cookie settings in production.

Server-only variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
AUTH_PASSWORD_MIN_LENGTH=12
AUTH_PHONE_COUNTRY=IN
AUTH_MAX_LOGIN_ATTEMPTS=
AUTH_MAX_RECOVERY_ATTEMPTS=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser, `NEXT_PUBLIC_*` variables, logs, error pages, or client bundles.

## 4. Phone number rules

Normalize phone numbers before validation, lookup, rate limiting, and storage:

- Accept common Indian formats such as `9390817811`, `+91 9390817811`, and `+919390817811`.
- Store the canonical E.164 format, for example `+919390817811`.
- Require exactly 10 valid Indian mobile digits after country-code normalization.
- Reject invalid prefixes and malformed values with a field-level error.
- Never display a complete phone number in logs or analytics.
- Mask phone numbers in UI where a full number is not required, for example `******7811`.
- Do not use phone number text as a password, booking reference, or authorization token.

Use one shared phone-normalization function in both server validation and tests. Do not duplicate regular expressions in components.

## 5. Password policy

Use a server-enforced password policy:

- Minimum 4 characters unless the approved security policy says otherwise.
- Reject passwords found in the breached-password list when Supabase supports it.
- Permit passphrases and common punctuation.
- Do not require arbitrary composition rules that reduce usability unless required by policy.
- Never log or persist plaintext passwords.
- Never return a password or password hash to the client.
- Do not reveal whether a phone number exists during recovery requests.

Friendly password messages:

- Too short: `Use a password with at least 4 characters.`
- Missing password: `Enter your password.`
- Password mismatch: `Passwords do not match.`
- Weak/rejected password: `Choose a stronger password that is not commonly used.`

## 6. Registration flow

### User experience

Registration form fields:

- Phone number.
- Password.
- Confirm password.
- Optional display name.
- Terms/privacy consent only if the product requires it.

Flow:

1. User submits the form.
2. Client performs quick validation for usability.
3. Server validates again and normalizes the phone number.
4. Server checks rate limits and request origin.
5. Supabase Auth creates the phone user using the official server-safe flow.
6. Supabase sends an OTP when phone verification is enabled.
7. User enters the OTP on a dedicated verification state.
8. Server verifies the OTP.
9. Create or upsert a minimal `profiles` row after verified signup.
10. Establish a secure session through Supabase SSR cookies.
11. Redirect to the account page or the original protected destination.

Do not create duplicate profile rows. The profile key must be the Supabase Auth user ID.

Registration success message:

`Account created. We sent a verification code to your phone.`

If verification is disabled:

`Your account is ready. You can now sign in.`

Safe duplicate/unknown message:

`We could not create the account with those details. Check the information and try again.`

Do not tell an attacker whether a phone number is already registered unless the product explicitly accepts that privacy tradeoff.

## 7. Phone/password login flow

Flow:

1. User submits phone and password.
2. Server normalizes and validates the phone.
3. Server checks login rate limits.
4. Supabase verifies credentials.
5. Middleware/server client refreshes the session securely.
6. Redirect to the requested safe destination or account page.
7. Record a redacted audit event with user ID, timestamp, result, and correlation ID.

Login success message:

`Welcome back.`

Invalid credentials message:

`Phone number or password is incorrect.`

Do not say whether the phone exists. Do not use different timing or messages for unknown phone versus wrong password.

Unverified account message:

`Verify your phone number before signing in.`

Too many attempts message:

`Too many sign-in attempts. Please wait a few minutes and try again.`

The login form must preserve the phone field after failure but never preserve the password field.

## 8. Forgot password flow

Use the Supabase-supported phone recovery/OTP flow selected for the project. Do not invent a custom recovery token system.

Flow:

1. User opens `/forgot-password`.
2. User enters a phone number.
3. Server normalizes the number and applies recovery rate limits.
4. Request the Supabase recovery OTP or approved recovery challenge.
5. Always show the same response whether the number is registered or not.
6. User enters the OTP on `/reset-password`.
7. Verify the recovery challenge and establish a short-lived recovery session.
8. Allow the user to submit a new password and confirmation.
9. Server validates the new password and updates it through Supabase Auth.
10. Invalidate old sessions where supported and sign the user into the new session only after success.
11. Redirect to login or account with a one-time success message.

Forgot password response:

`If an account exists for that number, we sent recovery instructions.`

Do not expose account existence, OTP values, recovery tokens, or provider responses.

Recovery errors:

- Invalid/expired OTP: `That code is invalid or expired. Request a new code and try again.`
- Too many OTP attempts: `Too many code attempts. Please wait before requesting another code.`
- Expired recovery session: `Your password reset session expired. Start again.`
- Provider failure: `We could not send the recovery code right now. Please try again shortly.`

## 9. Reset password flow

Reset form fields:

- New password.
- Confirm new password.

Requirements:

- Require a verified recovery session.
- Revalidate the password on the server.
- Never accept a user ID from the browser as authority.
- Never update another account based on a phone number alone.
- Invalidate or rotate sessions after a successful reset where supported.
- Prevent reuse of the current password where supported.
- Redirect away from token/OTP URLs after successful verification.
- Do not place recovery tokens in analytics, logs, page titles, or error messages.

Success message:

`Your password was updated. Please sign in with your new password.`

## 10. Authenticated password update

Account page flow:

1. Require a valid server session.
2. Ask for current password when Supabase/provider policy supports it.
3. Ask for new password and confirmation.
4. Validate on the server.
5. Update through Supabase Auth.
6. Invalidate other sessions where supported.
7. Record a redacted audit event.

Messages:

- Success: `Password updated successfully.`
- Wrong current password: `Your current password is incorrect.`
- Not authenticated: `Your session expired. Please sign in again.`
- Temporary failure: `We could not update your password. Please try again.`

Never show whether an account exists to an unauthenticated user.

## 11. Logout and session security

Implement:

- Current-device logout.
- Server-side session refresh middleware.
- Secure, HttpOnly, SameSite cookies where compatible.
- HTTPS-only cookies in production.
- Safe redirect allowlist after login/logout.
- Session expiration handling.
- Revocation behavior after password reset when supported.
- Server-side `getCurrentUser` checks for every protected page and action.
- No authorization based only on a client-side user object.

When a session expires during booking or account activity:

`Your session expired. Sign in again to continue.`

Never silently discard unsaved form data if it can be safely preserved.

## 12. Database profile model and RLS

Create a minimal profile table linked to `auth.users`:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone_e164 text unique,
  role text not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('customer', 'admin'))
);
```

Required rules:

- Enable RLS.
- Users may read and update only their own safe profile fields.
- Users cannot update their own role, phone verification state, or audit fields.
- Only authorized server/admin code may assign the admin role.
- Never trust a client-supplied role.
- Use a trigger or server use case to create the profile after verified signup.
- Ensure updates maintain `updated_at`.
- Add a unique index on canonical phone number.
- Do not copy password data into `profiles`.

## 13. API and status-code contract

Use typed responses and stable error codes:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Phone number or password is incorrect.",
    "requestId": "safe-correlation-id"
  }
}
```

Recommended endpoints:

- `POST /api/auth/register`
- `POST /api/auth/verify-phone`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-recovery-code`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`
- `GET /api/auth/me`

Status codes:

- `200`: successful login, logout, verification, password update, or safe recovery response.
- `201`: account created or verification challenge created.
- `400`: malformed request.
- `401`: unauthenticated or invalid credentials.
- `403`: account not verified or operation forbidden.
- `404`: do not use for account-existence probing; return a safe recovery response instead.
- `409`: profile conflict or illegal account state.
- `422`: invalid phone/password/OTP fields.
- `429`: rate limit exceeded, with `Retry-After`.
- `500`: unexpected internal failure without implementation details.
- `502`: identity/OTP provider failure.
- `503`: temporary authentication service outage.

## 14. Rate limiting and abuse prevention

Apply a shared production-capable rate limiter to:

- Registration by IP and normalized phone.
- Login by IP and normalized phone hash.
- OTP verification by challenge and IP.
- Forgot password by IP and normalized phone hash.
- Recovery verification by challenge and IP.
- Password reset by recovery session and IP.
- Password change by authenticated user and IP.

Rules:

- Use a shared store, not process memory.
- Return HTTP 429 with `Retry-After`.
- Add exponential backoff for repeated OTP requests.
- Prevent OTP resend abuse.
- Do not log raw phone numbers as rate-limit keys.
- Do not reveal whether a phone is registered.
- Add request body limits and origin/CSRF protection for mutations.
- Add CAPTCHA/provider protection if abuse levels require it.

## 15. User-friendly UI requirements

Every form must provide:

- Visible labels, not placeholder-only labels.
- `autocomplete` and appropriate `inputMode` values.
- Phone input optimized for mobile numeric keyboards.
- Password show/hide control with an accessible label.
- Inline field errors and a summary for screen readers.
- Disabled/loading submit state that prevents duplicate requests.
- Resend-code control with countdown and clear retry state.
- Focus moved to the first invalid field or meaningful status message.
- No loss of phone/display-name fields after recoverable errors.
- Password fields cleared after failures.
- `aria-live` status for OTP, recovery, and success messages.
- Support for keyboard-only use and reduced motion.

Required pages/components:

- `/register`
- `/verify-phone`
- `/login`
- `/forgot-password`
- `/verify-recovery-code`
- `/reset-password`
- `/account/security`
- Auth loading state.
- Auth error boundary.
- Session-expired dialog/state.
- Unauthorized/forbidden state.

## 16. Testing requirements

### Unit tests

- Indian phone normalization to E.164.
- Invalid phone formats and prefixes.
- Password policy and confirmation matching.
- Safe redirect allowlist.
- Typed auth error mapping.
- Masking/redaction utilities.
- OTP resend countdown logic.

### Supabase/database tests

- Profile created once after verified signup.
- Duplicate canonical phone prevented.
- RLS prevents reading another user profile.
- RLS prevents changing role or another user profile.
- Admin role cannot be self-assigned.
- Session expiry and refresh behavior.
- Migration applies to a clean test database.

### API tests

- Register success and validation failures.
- Login success, invalid credentials, unverified account, and rate limits.
- Forgot-password response does not reveal account existence.
- OTP success, invalid OTP, expired OTP, replayed OTP, and too many attempts.
- Reset password requires recovery session.
- Password update rejects mismatched or weak password.
- Logout invalidates session.
- CSRF/origin and body-size failures.
- Correct status codes and safe error messages.

### Browser E2E tests

- Register on mobile and desktop.
- Verify phone with a test OTP provider.
- Login and logout.
- Forgot password through test recovery provider.
- Reset password and sign in with the new password.
- Change password from the account page.
- Refresh during OTP/recovery flow.
- Expired session during a protected action.
- Duplicate-click protection on every auth form.
- Keyboard-only and accessible error flow.
- No password, OTP, token, or secret appears in URLs, page source, logs, or browser storage.

## 17. Production acceptance checklist

- [ ] Phone auth provider is enabled and tested in a non-production Supabase project.
- [ ] OTP/recovery templates and sender details are approved.
- [ ] Local, preview, and production redirect URLs are separated.
- [ ] Password policy is documented and server-enforced.
- [ ] Phone numbers are normalized and stored canonically.
- [ ] RLS tests pass for customer and admin roles.
- [ ] Service-role key is server-only.
- [ ] Sessions use secure SSR cookies.
- [ ] Login and recovery do not reveal account existence.
- [ ] Rate limiting uses a shared store.
- [ ] OTP resend and verification are replay-safe.
- [ ] Reset tokens and OTPs never appear in logs or analytics.
- [ ] All auth mutations have origin/CSRF protection.
- [ ] All forms are mobile-friendly and accessible.
- [ ] Auth error and loading pages are user-friendly.
- [ ] Unit, API, database, security, and browser tests pass.
- [ ] Monitoring and redacted audit events are enabled.
- [ ] Client has approved phone provider, OTP text, password policy, and account privacy behavior.
