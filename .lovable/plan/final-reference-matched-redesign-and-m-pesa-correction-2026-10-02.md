# Final reference-matched redesign and M-Pesa correction

## Goal
Match the supplied DEKUT BBIT 2026 reference across the public and signed-in experience while preserving every existing real data flow, permission, upload, AI, email, SMS, and recovery feature. Correct the M-Pesa request and polling integration using the supplied API contract without exposing its secret key.

## What will change
- Rebuild the shared visual system around the reference’s deep forest green, bright green, mint surfaces, white panels, compact rounded typography, fine borders, and restrained shadows.
- Restructure the signed-in shell to match the reference: dark green desktop sidebar, dense wide workspace, compact mobile header, five-item mobile bottom navigation, active states, and a recoverable More menu.
- Recompose the dashboard to the reference hierarchy using only live data: greeting banner, next class, summary counters, quick actions, today’s classes, announcements, assignments, and recent resources.
- Apply the same visual language to authentication, profile, SMS Premium, admin tools, tables, forms, search, filters, cards, and empty/loading/error states without removing any operation.
- Keep the uploaded screenshot as a design reference only; the live interface remains real HTML and real backend data.
- Correct M-Pesa endpoint handling for `POST /api/payments/stkpush` and `GET /api/payments/status/{checkoutRequestId}`, accepting both top-level and nested provider response shapes for the checkout ID, payment status, and receipt.
- Keep the payment API key server-only, preserve payment ownership checks, and ensure a completed payment is credited once.

## Technical notes
- Existing TanStack routes, Lovable Cloud data, private storage, authentication, role checks, server functions, SMS subscriptions, and automatic notifications stay intact.
- Shared semantic tokens and reusable shell/components will carry most of the redesign consistently across all pages.
- No mock arrays, fake counters, seeded records, or simulated payment success will be introduced.

## Validation
- Check the public landing and authentication screens at desktop and phone widths.
- Sign in with a real managed session and verify dashboard, navigation, profile/SMS, and administrator SMS tools.
- Validate that the M-Pesa request is constructed against the documented URL and that polling handles pending, completed, failed, and cancelled responses safely.
- Confirm current build diagnostics are clean and verify no horizontal overflow or overlapping controls.
