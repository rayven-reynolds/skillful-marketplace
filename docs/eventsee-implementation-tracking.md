# Eventsee implementation tracking

**Overall progress:** `100%` *(MVP scope; optional backlog below)*

## TLDR

Eventsee MVP: Next.js (`web/`) + FastAPI (`api/`) + PostgreSQL. Premium is admin-flag only (no Stripe). Session cookies flow through Next rewrites in dev.

**Last verification:** `pytest` (API) and `npm run build` (web) completed successfully in CI-style runs.

**Browse preview:** `/browse` renders six static planner cards (three personal, two corporate, one hybrid) with Unsplash portfolio covers, a sticky blurred nav, and a Personal / Corporate / All segmented control driven by `?segment=` so the filter is shareable without any client JS.

## Tasks

- [x] 🟩 **Scaffold Next.js (`web/`)** — App Router, Tailwind, mobile-first shell.
- [x] 🟩 **Scaffold FastAPI (`api/`) + Alembic** — Models, initial migration, `psycopg` driver.
- [x] 🟩 **Auth + sessions** — Register/login/logout/me, HTTP-only cookie, role guard.
- [x] 🟩 **Planners, search, filters, availability** — Public list/detail, busy blocks, filter query params.
- [x] 🟩 **Favorites, portfolio, inquiries, messages** — Favorites CRUD, dual intake, threads, response-time samples.
- [x] 🟩 **Bookings, reviews, quiz, admin premium** — Booking transitions, gated reviews, quiz match, admin PATCH premium.
- [x] 🟩 **Planner dashboard + checklist tool** — Dashboard pages, wedding checklist + `/me/checklist` sync.
- [x] 🟩 **Pytest + README smoke path** — `pytest` (quiz scoring + health), root README runbook.

## Remaining (optional next)

- [ ] 🟥 **Stripe** — Checkout + webhooks + `premium_expires_at` self-serve (post-MVP).
- [ ] 🟥 **Email / password reset** — Transactional email provider.
- [ ] 🟥 **Playwright** — End-to-end smoke for auth + inquiry.
