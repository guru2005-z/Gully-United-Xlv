# Gully United XLV Product Requirements

## 1. Product

Gully United XLV is a premium cricket turf and sports-entertainment venue in Kota. The website must let visitors understand the venue, view facilities and pricing, contact the venue, and request a one-hour turf slot.

## 2. Current scope

- Keep the current application working across public and admin routes.
- Preserve the existing routes: home, book, venue, facilities, pricing, gallery, contact, and admin.
- Support server-backed Supabase slot holds and Razorpay live checkout.
- Do not add deployment work in this phase.

## 3. Business rules

- Venue hours: 06:00 through 23:00; each bookable slot is one hour.
- Booking capacity is a maximum of 16 players.
- Day price: INR 299 before 17:00.
- Night price: INR 499 from 17:00.
- A slot is unavailable when it has a non-cancelled booking or a venue block.
- Booking input requires name, Indian mobile number, email, player count, date, and start hour.
- Payment capture policy: Auto-capture full slot amount immediately on Razorpay checkout (`payment_capture: 1`).
- Cancellation and refund policy: Admin-approved refunds only via the protected admin dashboard (`START_REFUND` action); no automatic self-serve cancellation refunds.

## 4. User features

- Browse venue information, facilities, gallery, pricing, and contact details.
- Select an eligible date and available one-hour slot.
- See the calculated price before confirming.
- Pay online via Razorpay Live Checkout and receive a confirmed booking reference.
- Admin dashboard can inspect bookings, cancel bookings, initiate partial/full Razorpay refunds, and block slots.

## 5. Later features

- WhatsApp notification to the admin after a booking is server-confirmed (once provider credentials are configured).
- Vercel deployment and production operations.

## 6. Non-functional requirements

- TypeScript strictness, accessible forms, responsive layouts, keyboard navigation, and useful loading/error states.
- No secret keys in client code.
- Prices and availability must be computed and enforced server-side.

## 13. Needs Client Input

- Confirm the WhatsApp provider, admin recipient number, and notification message template.
