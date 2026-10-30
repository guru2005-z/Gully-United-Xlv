# Testing Requirements

## Current phase

- Run `npm run lint` after code changes.
- Run `npm run build` before considering a slice complete.
- Run `npm run typecheck` for TypeScript validation.
- Run `npm run test:run` for the canonical Vitest suite.
- Run `npx playwright install --with-deps chromium` once, then `npm run test:e2e` for browser smoke coverage.
- Run `supabase test db` against a linked disposable dev project for RLS assertions in `supabase/tests/rls.sql`.
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

## Test setup and CI

- Vitest remains the unit and local integration test runner. Existing tests cover booking, auth, and Razorpay pure helpers.
- Playwright is configured in `playwright.config.ts` with Chromium desktop and iPhone 13 projects. The initial suite intentionally covers public smoke journeys only; authenticated booking/payment tests require disposable test accounts and provider sandbox configuration.
- Supabase RLS assertions use database roles and catalog privileges only. They must run against the linked database and never use a service-role key in application/browser tests.
- GitHub Actions workflow: `.github/workflows/quality.yml` runs install, lint, typecheck, Vitest, build, and Playwright browser tests.
- No Maven or Gradle project exists in this repository, so Maven checks are not applicable.
