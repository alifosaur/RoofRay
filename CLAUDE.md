# CLAUDE.md: rules for working on this repo

Solar-installer ERP: FastAPI (`backend/app`) + React/Vite (`frontend/src`), Postgres, Redis, Firebase auth.
Read `README.md` for setup, the role matrix and the workflow diagram.

## Non-negotiables

1. **No demo, mock or sample data, anywhere outside `backend/tests/`.** No seed scripts, fake customers/orders/serials,
   demo logins, pre-filled form values, fallback names/amounts or invented chart numbers. Empty data shows an
   empty state and zeros. Configuration (catalogue, BOM templates, warranty terms, scheme content) lives only in
   `backend/app/load_catalog.py` and is loaded explicitly. Run `scripts/check_no_mock_data.sh` before committing.
2. **Never fabricate values to fill gaps.** If a number is unknown (cost, time, capacity, address), return `None`/0
   and let the UI say so. Estimates must be labelled as such in a comment and in the UI.
3. **Auth:** Firebase ID tokens when configured, otherwise local password + signed session JWT
   (`app/core/security.py`). Never accept raw UIDs as tokens. Public registration creates only customers; only an
   admin creates staff (`POST /api/users`).
4. **Access:** every endpoint uses `require_role(...)` and the object-level rules in `app/core/access.py`
   (customer → own records; sales → own leads and their quotes/orders; technician → assigned surveys and released
   jobs; warehouse → fulfilment-stage orders; admin → everything). Every frontend route is wrapped in `RoleRouteGuard`.
5. **Tests use a throwaway DB** (`tests/conftest.py`). Never point tests at a real database.

## Workflow state machine (enforce in services, never only in the UI)

| From | Action (role) | To | Gate |
|---|---|---|---|
| — | enquiry (customer/public) | Lead NEW, auto-assigned to sales | — |
| Lead NEW/CONTACTED | call checklist (sales) | QUALIFIED or LOST (reason required) | — |
| Lead NEW/CONTACTED/QUALIFIED | schedule survey + technician (sales) | Survey SCHEDULED, lead SURVEY_SCHEDULED | one survey per lead, active technician |
| Survey SCHEDULED | submit measurements + photos + feasibility (assigned technician) | feasible → APPROVED, lead SURVEY_APPROVED (auto); not feasible → COMPLETED | — |
| Survey COMPLETED | approve / reject (sales owner, admin) | APPROVED → lead SURVEY_APPROVED / REJECTED → lead LOST | only for surveys the technician did not approve |
| Survey APPROVED | create quote from BOM template (sales) | Quote DRAFT (lead stays SURVEY_APPROVED) | **no quote before approval** |
| Quote DRAFT | edit BOM lines; send (sales) | SENT, lead QUOTED (auto) | only drafts are editable |
| Quote SENT | accept (customer or sales recording it) | ACCEPTED, lead WON, order CONFIRMED + pick list to warehouse + install job + invoice + subsidy record; other open quotes for the lead → REJECTED | one order per lead |
| Order CONFIRMED+ | record payments (sales) | invoice PAID / order CLOSED when fully paid after install | payment ≤ balance |
| Order CONFIRMED/PACKING | scan serials (warehouse) | first scan → PACKING | Redis lock + unique serial; serial must be IN_STOCK and in the BOM |
| PACKING → PACKED → DISPATCHED → OUT_FOR_DELIVERY → DELIVERED | warehouse | next stage only | **PACKED and DELIVERED need every serialised item scanned**; packing deducts stock |
| Order DELIVERED | — | warranty start/end computed; install job released to technician | never typed by hand |
| Job SCHEDULED | start (assigned technician) | IN_PROGRESS | order delivered |
| Job IN_PROGRESS | complete with times, size, generation test, ≥1 photo, signature | COMPLETED; order INSTALLED; timesheet + payout | — |
| Order INSTALLED | fully paid | CLOSED; invoice PAID | — |
| Subsidy | one step at a time with date/ref/document (sales, admin) | NOT_APPLIED → … → DISBURSED (or REJECTED) | Off-Grid not eligible |

**Every hand-off must call `app.core.events.emit(...)`** in the same transaction: it writes the outbox row (live SSE
update for the right roles/users), the notifications for receiving users, and invalidates dashboard caches after
commit. Pair it with an `AuditLog` entry; admin edits go through `audit_service.apply_changes` (old → new values).

## Live data

* SSE: `GET /api/events?token=` (reads `outbox_events`). Frontend: `useLiveRefresh(prefixes, refetch)` from
  `src/live/LiveEvents.tsx`; add any new event type to `EVENT_TYPES` there.
* Dashboards: real aggregate queries in `services/report_service.py`, cached via `app.core.cache.cached` (≤60 s).
  Cache misses or missing Redis must fall through to the DB.

## Working style

Small steps; after each, run the check that proves it (`pytest`, `scripts/check_no_mock_data.sh`,
`npm run build`) and commit. Extend existing services/routers rather than adding parallel ones.
