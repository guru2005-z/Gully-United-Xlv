# Testing Requirements

## Current phase

- Run `npm run lint` after code changes.
- Run `npm run build` before considering a slice complete.
- Test booking validation for invalid phone, email, player count, date, and hour.
- Test day/night pricing, available hours, past slots, duplicate slots, cancellation, and blocked slots.
- Manually verify booking and admin flows at mobile and desktop widths.

## Later backend phase

- Test database-level duplicate-slot races and expiring holds.
- Test RLS for anonymous, customer, and admin access.
- Test server-side amount calculation and idempotency.
- Test invalid Razorpay signatures, wrong order/amount, replayed callbacks, duplicate webhooks, failures, and refunds.
- Test that no server secret appears in client bundles.

## Accessibility and regression

- Keyboard-test navigation, forms, dialogs, mobile menu, and admin controls.
- Verify visible focus, labels, error announcements, contrast, reduced motion, and no horizontal scrolling at 320px.
- Verify route metadata, `noindex` admin behavior, sitemap, robots, and structured data when SEO work begins.
