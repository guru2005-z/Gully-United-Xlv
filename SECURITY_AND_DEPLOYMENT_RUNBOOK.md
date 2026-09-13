# Gully United XLV Security and Deployment Runbook

This runbook is required before deploying the Next.js + Supabase + Razorpay + WhatsApp application. It covers the security work that must be completed before deployment and the exact deployment gates. It does not replace the feature, payment, authentication, testing, or production-readiness specifications.

The current repository is still a Vite/TanStack prototype. Do not deploy the current in-memory booking implementation as a real multi-user booking system. Use this runbook after the Next.js, Supabase, authentication, transactional booking, Razorpay, and notification phases are implemented.

## 1. Required files and specifications

The project documentation set is complete for planning when these files exist:

- `PRD.md`
- `agents.md`
- `design.md`
- `architecture.md`
- `rules.md`
- `decisions.md`
- `memory.md`
- `testing.md`
- `FEATURES.md`
- `SUPABASE_PHONE_AUTH_FEATURES.md`
- `NEXTJS_SUPABASE_RAZORPAY_IMPLEMENTATION_PROMPTS.md`
- `NEXTJS_SUPABASE_RAZORPAY_PRODUCTION_READINESS.md`
- `PROJECT_COMPLETION_AND_CLIENT_HANDOFF.md`
- `SECURITY_AND_DEPLOYMENT_RUNBOOK.md`

The files describe the work. Deployment is allowed only after the application and all checks below pass.

## 2. Secret management

### Never commit

Never commit or paste into source code:

- Supabase service-role key.
- Razorpay secret key.
- Razorpay webhook secret.
- WhatsApp access token or provider credentials.
- Error-reporting DSN if it contains sensitive credentials.
- Database passwords.
- Auth provider private keys.
- `.env.local`, `.env.production`, exported dashboard secrets, or real customer data.

Add these to `.gitignore`:

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
secrets/
```

### Environment variables

Commit only an `.env.example` with empty values:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
WHATSAPP_PROVIDER=
WHATSAPP_API_URL=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_ADMIN_PHONE=
WHATSAPP_BOOKING_TEMPLATE=
ADMIN_EMAILS=
AUTH_PASSWORD_MIN_LENGTH=12
AUTH_PHONE_COUNTRY=IN
RATE_LIMIT_STORE_URL=
ERROR_REPORTING_DSN=
```

Rules:

- Only `NEXT_PUBLIC_*` variables may be bundled into browser code.
- Validate required variables at server startup with a typed environment module.
- Fail clearly when a server secret is missing; never silently use an empty value.
- Do not print environment values during builds, tests, startup, or error reporting.
- Use separate values for local, preview, and production.
- Store production secrets in Vercel Environment Variables or an approved secret manager, not in the repository.
- Restrict who can view or edit production secrets.
- Rotate any secret that has appeared in chat, source, logs, screenshots, or a shared document.

## 3. Supabase security

Before production:

- Create separate local/test and production Supabase projects.
- Apply migrations to a clean test project before production.
- Back up the production database before migrations.
- Enable Row Level Security on every exposed table.
- Test anonymous, customer, and admin access negatively and positively.
- Never use the service-role key in a client component, public environment variable, browser request, or edge-exposed payload.
- Keep admin operations in server-only route handlers or server actions.
- Use database transactions/functions for holds, status transitions, payment confirmation, and outbox creation.
- Confirm the partial unique active-slot index exists before accepting bookings.
- Confirm expired holds cannot block slots permanently.
- Enable database backups and verify a restore procedure.
- Restrict database access to approved projects and users.
- Review Supabase Auth redirect URLs and remove unused origins.
- Enable phone OTP abuse protection and leaked-password protection where available.
- Review auth session lifetime and secure cookie behavior.

Required SQL checks:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public';

select indexname, indexdef
from pg_indexes
where schemaname = 'public';
```

Every exposed table must have intentional RLS policies. Do not treat enabling RLS without policies as a complete authorization design.

## 4. Razorpay security

Before production:

- Use Razorpay test mode in local and preview environments.
- Use production credentials only in the production secret store.
- Keep the Razorpay secret key server-only.
- Keep the webhook secret server-only.
- Configure the exact production webhook URL and required events.
- Verify the raw webhook body and signature before parsing or mutating data.
- Verify order ID, payment ID, amount, currency, booking ownership, and valid status transitions.
- Store provider event IDs or hashes for replay protection.
- Make order creation, callbacks, webhooks, and refunds idempotent.
- Never confirm a booking from a browser callback alone.
- Never log full webhook bodies, signatures, secret values, or unnecessary customer data.
- Test delayed, duplicate, out-of-order, invalid, and failed webhook events.
- Confirm Razorpay dashboard access is limited to authorized client/admin users.

If a payment state is uncertain, show `Payment verification pending` and reconcile with the provider. Never tell the customer that payment failed merely because the browser timed out.

## 5. WhatsApp notification security

Before production:

- Use an approved WhatsApp Business/provider API, not a browser `wa.me` link for backend notifications.
- Store access tokens only as server secrets.
- Verify the admin recipient number.
- Approve the message template and allowed customer fields.
- Send only the minimum operational booking information.
- Use an idempotency key based on booking ID and notification type.
- Store notification status and provider message ID in the outbox.
- Retry transient errors with bounded backoff and jitter.
- Do not roll back a confirmed booking when WhatsApp is unavailable.
- Redact provider tokens and responses from logs.
- Test provider timeouts, rate limits, invalid recipients, duplicate worker execution, and retry recovery.

## 6. Application security

Implement and verify:

- Strict TypeScript and Zod validation at every external boundary.
- Server-side authorization for every admin route, API, action, export, and report.
- Safe redirect allowlists after authentication.
- CSRF/origin protection for browser mutations.
- Request body and upload size limits.
- Rate limiting using a shared production-capable store.
- Timeouts on provider and database calls.
- Bounded retries only for operations proven idempotent.
- Correlation IDs without sensitive values.
- Redacted structured logging.
- No stack traces, SQL, tokens, payment data, or environment values in user errors.
- Safe error pages for 400, 401, 403, 404, 409, 429, 500, 502, 503, and 504 states.
- Dependency scanning and lockfile review.
- Secret scanning in CI and before every release.
- No dynamic SQL from untrusted input.
- No raw HTML rendering from customer input.
- No unsafe file uploads unless explicitly designed and scanned.

## 7. Next.js and browser security

Configure:

- Content Security Policy allowing only required Next.js, Supabase, Razorpay Checkout, image, and font origins.
- `Strict-Transport-Security` in production over HTTPS.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy` with a privacy-preserving value.
- Frame protection through CSP `frame-ancestors` or the supported equivalent.
- Secure, HttpOnly, SameSite cookies for sessions.
- No auth or payment secrets in localStorage, URLs, analytics, or page source.
- `noindex` for admin, payment, private booking, reset-password, and error pages where appropriate.
- Dependency versions locked and reviewed.

Test the final headers with a production-like environment. CSP must be tested with Razorpay Checkout and Supabase Auth before enforcing a strict policy.

## 8. Vercel deployment setup

### Project settings

- Import the correct repository and production branch.
- Set the framework to Next.js after the migration is complete.
- Configure the correct Node.js version and package manager.
- Configure build and install commands from the actual `package.json`.
- Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS domain.
- Add environment variables separately for Development, Preview, and Production.
- Do not copy test Razorpay secrets into Production.
- Restrict production deployments to approved maintainers.
- Enable preview deployments for pull requests.
- Configure the final custom domain and HTTPS certificate.
- Configure Vercel logs and error monitoring without exposing secrets.

### Supabase production settings

- Add the production site URL to Supabase Auth allowed URLs.
- Add only required preview URLs, with a documented policy for temporary previews.
- Verify phone auth provider settings and OTP templates.
- Confirm database migrations have been applied.
- Confirm RLS and indexes in the production project.

### Razorpay production settings

- Add the production webhook URL.
- Select only required webhook events.
- Store the production webhook secret in Vercel.
- Confirm the production key ID matches the production secret.
- Run a controlled low-value production verification according to the client’s payment policy.
- Reconcile the test payment and verify booking/admin notification behavior.

### WhatsApp production settings

- Configure the approved provider endpoint, token, recipient, and template in Production only.
- Verify template approval and recipient opt-in requirements.
- Send a controlled admin test notification.
- Confirm retries and failure status are visible to the admin.

## 9. CI/CD release gates

The deployment pipeline must fail if any required check fails:

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:unit
npm run test:api
npm run test:sql
npm run test:e2e
npm run build
npm run scan:secrets
```

If scripts are named differently, update this runbook and `PROJECT_COMPLETION_AND_CLIENT_HANDOFF.md` with the real commands.

CI must also:

- Install from the lockfile.
- Run against a clean environment.
- Use test Supabase/Razorpay/WhatsApp adapters or test credentials.
- Apply migrations to a disposable test database.
- Run concurrent booking tests.
- Run auth RLS negative tests.
- Run payment signature and webhook replay tests.
- Check generated bundles for server secret leakage.
- Retain test reports and release commit identifiers.
- Require approval before Production deployment.

## 10. Pre-deployment verification

Do not deploy until every item is checked:

- [ ] Next.js is the active application and no prototype in-memory booking path is used.
- [ ] All client policy decisions are approved and recorded in `decisions.md`.
- [ ] Production secrets are stored only in the secure environment manager.
- [ ] Secret scan passes.
- [ ] No credentials exist in git history or generated output.
- [ ] Supabase migrations and RLS tests pass.
- [ ] Database backups and restore are verified.
- [ ] Active-slot uniqueness and concurrent booking tests pass.
- [ ] Expiring holds release slots.
- [ ] Server computes all booking amounts in integer paise.
- [ ] Razorpay signatures, order ownership, and webhooks are verified.
- [ ] Duplicate and delayed payment events are safe.
- [ ] WhatsApp notification outbox is idempotent and retryable.
- [ ] Admin routes and analytics are server-authorized.
- [ ] Rate limits and abuse controls are active.
- [ ] Error pages and status codes are tested.
- [ ] SEO metadata, sitemap, robots, and JSON-LD are validated.
- [ ] Mobile booking works at 320px without horizontal overflow.
- [ ] Accessibility checks pass.
- [ ] Performance budgets and Core Web Vitals are acceptable.
- [ ] Monitoring and alerting are active.
- [ ] Razorpay and Supabase dashboard configuration is documented.
- [ ] Client has tested and approved the complete booking flow.

## 11. Post-deployment smoke test

Immediately after deployment, verify:

1. Home, booking, contact, and public SEO pages load over HTTPS.
2. Registration and phone verification work with a controlled test account.
3. Login, logout, forgot password, reset password, and password update work.
4. Availability loads and a test slot can be held.
5. A controlled Razorpay payment reaches the expected verified state.
6. The booking is confirmed exactly once.
7. Admin sees the booking and correct statistics.
8. Admin receives exactly one WhatsApp notification.
9. Duplicate webhook delivery does not duplicate the booking or message.
10. A forced provider failure produces a friendly pending/retry state.
11. Logs contain correlation IDs but no secrets or unnecessary personal data.
12. Rollback or disablement procedure is known to the operator.

## 12. Key rotation and incident response

### Rotate immediately when

- A secret is committed.
- A secret appears in a screenshot, chat, log, or browser bundle.
- An unauthorized person has accessed a dashboard.
- A webhook signature or token may have leaked.
- Suspicious payment or auth activity is detected.

### Rotation order

1. Disable or rotate the exposed provider key in its dashboard.
2. Update the secure environment manager.
3. Redeploy with the new value.
4. Verify health, payments, webhooks, authentication, and notifications.
5. Review logs and audit events for misuse.
6. Record the incident without storing the exposed secret.

### Incident response

- Stop unsafe mutations if booking or payment truth may be compromised.
- Preserve correlation IDs, provider event IDs, and audit records.
- Do not delete evidence or rewrite payment history.
- Reconcile Razorpay and Supabase state before customer communication.
- Notify the client using approved support procedures.
- Document root cause, impact, mitigation, and follow-up test.

## 13. Client handoff security package

Give the client:

- Production URL and admin URL.
- Ownership transfer instructions for Vercel, Supabase, Razorpay, and WhatsApp provider.
- Secret names and environment ownership map, never secret values.
- Rotation instructions.
- Backup/restore instructions.
- Webhook configuration and reconciliation procedure.
- Admin onboarding and offboarding procedure.
- Monitoring and alert contacts.
- Incident response contact and escalation path.
- Test evidence and signed release checklist.

## 14. Final decision

The project is secure and ready to deploy only when the implementation is Next.js-based, all production-readiness tests pass, all secrets are stored securely, Supabase/Razorpay/WhatsApp configurations are verified, concurrency and payment edge cases are tested, monitoring is active, and the client signs off.
