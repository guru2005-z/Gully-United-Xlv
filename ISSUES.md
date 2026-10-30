# Phase 2 QA Issue Register

Date: 2026-09-21
Scope: Runtime and source-level validation of authentication, booking, availability, payments, webhooks, refunds, and deployment configuration.

## Confirmed Issues

| ID     | Severity | Area                       | Status                                      | Finding                                                                                                                                                                                                                                                                                                                            |
| ------ | -------- | -------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001 | Critical | Booking holds / Supabase   | Fixed in code; runtime pending              | `app/api/bookings/hold/route.ts` now uses the server-side service-role client required by the hardened `create_booking_hold` RPC and resolves the actual `Gully United XLV` venue ID from `venues`. A Supabase dev/test request is still required to prove the RPC, schema, and RLS behavior together.                             |
| QA-002 | Critical | Database migrations        | Fixed in migration source; clean DB pending | `20260914020000_full_hardening_schema.sql` now uses canonical uppercase booking statuses, and the production-readiness migration converts legacy rupee amounts to paise. A clean Supabase migration run is still required to prove the ordered chain.                                                                              |
| QA-003 | High     | Razorpay webhook           | Fixed in code; runtime pending              | The webhook handler now confirms only `payment.captured` events, writes the uppercase booking payment status, and no longer treats authorization or `order.paid` order IDs as captured payment IDs. Provider-event integration validation remains pending.                                                                         |
| QA-004 | High     | Hold expiry / availability | Fixed in migration source; clean DB pending | The final `create_booking_hold` function now marks an expired matching `HOLD` as `EXPIRED` inside the same transaction before inserting the replacement hold. The active-slot index can then release the slot without relying on an invalid time-dependent index predicate. Clean database concurrency validation remains pending. |
| QA-005 | High     | Order creation validation  | Fixed in code; runtime pending              | The guest `date` and `hour` path now validates customer name/email/Indian phone and the canonical booking date window, resolves the real venue, and creates the hold through the atomic `create_booking_hold` RPC. Hardcoded fallback customer data and direct inserts were removed. Supabase runtime validation remains pending.  |
| QA-006 | High     | Admin refunds              | Fixed in code; runtime pending              | The admin `START_REFUND` action now validates stored payment data, prevents over-refunds and matching duplicate refunds, calls Razorpay, persists the gateway refund ID/status, and only marks the booking refunded after provider success. Test-key provider validation remains pending.                                          |
| QA-007 | Medium   | Environment safety         | Fixed in code; runtime pending              | `requireSupabaseAdminEnv()` no longer falls back to a hardcoded project URL and now throws `SUPABASE_SERVER_CONFIGURATION_MISSING` when the URL or service-role key is missing/placeholder. Deployment startup validation remains pending.                                                                                         |
| QA-013 | High     | Order persistence          | Fixed in code; runtime pending              | Order creation now checks booking and payment persistence errors before returning a Razorpay order, preventing orphaned provider orders. Supabase integration validation remains pending.                                                                                                                                          |
| QA-014 | Medium   | Rate-limit concurrency     | Fixed in migration/source; clean DB pending | Auth rate limits now use an advisory-lock-backed `consume_rate_limit` RPC instead of separate read/write operations. The migration must be applied and exercised against Supabase.                                                                                                                                                 |
| QA-015 | High     | Webhook replay concurrency | Fixed in migration/source; clean DB pending | Webhook events now carry a processing claim. Concurrent duplicates return `202` without reprocessing, while claims older than five minutes can be reclaimed. Supabase migration and concurrent delivery validation remain pending.                                                                                                 |

## Coverage Gaps

| ID     | Severity | Area                | Status                              | Gap                                                                                                                                                                                                                                                    |
| ------ | -------- | ------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QA-008 | High     | Browser E2E         | Setup added; execution pending      | Playwright configuration now covers Chromium desktop/mobile projects and public smoke journeys. Authenticated booking/payment/refund journeys still require disposable test accounts, sandbox configuration, and browser execution.                    |
| QA-009 | High     | API integration     | Open                                | The project still lacks route-level tests for Supabase permissions, booking-hold races, RLS, idempotency, authentication cookies, and API error contracts. Test commands and RLS SQL scaffolding are now present, but route execution is not verified. |
| QA-010 | High     | Payment integration | Partial coverage; execution pending | Pure Razorpay signature tests exist and the webhook/refund code paths are hardened, but provider-backed payment, webhook replay, failure, and refund tests still require Razorpay TEST MODE and a disposable database.                                 |
| QA-011 | Medium   | Auth abuse controls | Fixed in code; runtime pending      | Login, registration, password recovery, and phone verification now use scoped rate-limit keys. The limiter uses the server-side admin client and fails closed if the backing store is unavailable. Supabase runtime verification remains pending.      |
| QA-012 | Medium   | Database validation | Test added; execution pending       | `supabase/tests/rls.sql` now checks RLS enablement and booking-hold function privileges without service-role credentials. A clean migration and RLS run remains required.                                                                              |

## Baseline Evidence

- Existing canonical test command: `npm test` / `vitest run`.
- Existing unit inventory: five Vitest files, plus the Playwright smoke suite at `e2e/public-smoke.spec.ts`.
- Existing reported baseline: 5 test files passed and 18 tests passed.
- Editor diagnostics: no errors reported.
- Browser E2E prerequisite status and full build/lint/typecheck output still require reliable command capture in this environment.
- QA-001 code validation: no editor/TypeScript diagnostics in the changed route. Supabase runtime validation remains pending because this environment has not produced a reliable route execution result.
- QA-002 static validation: no editor diagnostics in the changed migration; no lowercase booking-status literals remain in the migration's enum/default/index path. Clean database execution remains pending.
- QA-003 code validation: no editor/TypeScript diagnostics in the webhook route. The Razorpay-focused test command was invoked, but this terminal did not return usable test stdout; provider-event integration validation remains pending.
- QA-004 static validation: no editor diagnostics in the migration; the expiry transition is present before the hold insert. Database race/expiry validation remains pending.
- QA-005 code validation: no editor/TypeScript diagnostics in the changed order route. Route-level Supabase and Razorpay runtime validation remains pending.
- QA-006 code validation: no editor/TypeScript diagnostics in the changed admin route. Razorpay test-key refund validation remains pending.
- QA-007 code validation: no editor/TypeScript diagnostics in `src/lib/env.ts`; the hardcoded Supabase URL is removed and missing configuration fails closed.
- QA-011 code validation: no editor/TypeScript diagnostics in the limiter or four protected auth routes. Backing-table and repeated-request runtime validation remains pending.
- Phase 2 re-audit: identified and fixed payment-status casing, legacy rupee-to-paise conversion, unsafe `order.paid` payment identity handling, unchecked order persistence errors, duplicate/over-refund behavior, and rate-limit concurrency.
- Webhook replay hardening: added a processing claim and stale-claim recovery migration for concurrent or interrupted deliveries.
- Playwright setup: the direct dependency, configuration, and smoke suite are now declared; local package installation/browser execution still needs verification.
- Testing setup: added `test:run`, `test:e2e`, Playwright desktop/mobile configuration, public smoke tests, Supabase RLS assertions, and GitHub Actions quality workflow. Playwright installation and execution still need a working package install/browser download.

## Phase 2 Rerun Evidence — 2026-09-21

- Repository diagnostics: no errors reported across the workspace.
- Test inventory: five Vitest files plus Playwright configuration and one browser smoke spec are present.
- Startup attempt: `npm run dev -- --port 3002` was blocked by the Windows PowerShell execution policy; `npm.cmd` bypassed that wrapper, but port 3002 is already occupied by an existing process.
- HTTP smoke check: attempted against the existing port-3002 process, but the terminal wrapper returned no response body/status output, so endpoint success is not claimed.
- Clean Supabase migration/RLS execution, route integration tests, browser E2E, and reliable build/lint/typecheck output remain unverified.

## Phase 2 Restart Evidence — 2026-09-21

- Fresh workspace diagnostics: no errors reported.
- Fresh test inventory: five Vitest files plus Playwright configuration and one browser smoke spec.
- Canonical Vitest execution was retried through `npm.cmd`, `cmd.exe`, and file-backed PowerShell execution; the terminal integration returned no output and did not create the expected log, so test pass/fail is not claimed.
- No credential values were read, printed, or used during this restart.
- Supabase migration/RLS, Razorpay provider behavior, route integration, browser E2E, and build/lint/typecheck remain runtime validation tasks.

## Phase 2 Testing-Setup Restart — 2026-09-21

- Fresh diagnostics: no errors in the Playwright config, smoke spec, RLS SQL test, CI workflow, or package manifest.
- Requested commands were invoked: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`, and Playwright discovery. This terminal returned no command output, so no pass/fail claim is made.
- Playwright config and public smoke tests exist, but the local `node_modules` installation was not verifiably available. Browser execution requires `npm install` followed by `npx playwright install --with-deps chromium`.
- The lockfile currently contains the Playwright declaration at the root and Next's optional peer metadata, but no independently verified installed package entry was observed.
- `supabase/tests/rls.sql` uses catalog privilege checks only; it does not load or print any secret key.

## Phase 2 Retest — 2026-09-21

- Fresh workspace diagnostics: no errors reported.
- Retested `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build`; the terminal returned no command output or reliable exit-code evidence.
- Retested Playwright discovery; browser execution remains unconfirmed because the local Playwright binary/browser installation could not be observed reliably.
- Retested Supabase CLI availability; migration/RLS execution remains unconfirmed in this environment.
- No secrets were read, printed, or used.

## Phase 2 Source Check — 2026-09-21

- Workspace diagnostics: no errors reported.
- Test assets: six files total, including five Vitest files and `e2e/public-smoke.spec.ts`.
- Configuration assets present: `playwright.config.ts`, `.github/workflows/quality.yml`, and `supabase/tests/rls.sql`.
- Payment source scan found no remaining lowercase booking payment-status writes, `order.paid` confirmation branch, or unconverted `amount_paise = amount` migration update.
- Runtime execution of npm, Playwright, Supabase migrations/RLS, and provider tests remains unverified because command output is unavailable in this environment.

## Phase 2 Exit Criteria

- Every Critical and High issue is fixed or explicitly accepted with a documented owner and mitigation.
- Playwright or an equivalent browser test fallback covers the critical user journeys.
- Route-level tests cover auth, availability, booking holds, order creation, payment verification, webhooks, and refund behavior.
- A clean database migration and RLS validation is completed against the dev/test Supabase project.
- Build, lint, typecheck, and canonical unit tests have fresh, recorded passing output.
