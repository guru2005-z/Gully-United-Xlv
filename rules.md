# Coding and Security Rules

- Use TypeScript and existing project patterns; avoid `any` and one-letter names.
- Keep pure booking calculations separate from UI and side effects.
- Validate all external input with Zod at the boundary.
- Never trust client-supplied price, payment state, availability, role, or admin status.
- Later backend work must enforce uniqueness and expiry in the database, not only in UI code.
- Razorpay signatures and webhook bodies must be verified on the server before state changes.
- Never expose Supabase service-role or Razorpay secret keys to the browser.
- Admin authorization must be checked server-side on every protected operation.
- Use safe user-facing errors and do not log personal data, tokens, or payment secrets.
- Preserve existing public routes and brand assets unless the relevant project document is updated.
- Prefer small edits, existing components, and focused tests over broad rewrites.
- Do not add deployment configuration in the current phase.
