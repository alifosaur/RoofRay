# Project Progress Checklist

## Completed Work
- [x] **Phase 1: Foundation & Auth** - FastAPI, PostgreSQL/SQLite, Firebase auth with RBAC (admin, sales, technician, warehouse, support, accounts).
- [x] **Phase 2: CRM & Surveys** - Public inquiry form, call checklists, technician survey scheduling/feasibility approval, survey gate.
- [x] **Phase 3: Catalog & Quotes** - Product catalog, 3kW/5kW BOM templates, quote creation, PDF generation, quote acceptance.
- [x] **Phase 4: Orders & Warehouse** - Confirmed orders, payment records, inventory stock deduction, auto-generated pick lists.
- [x] **Phase 5: Serial Dispatch & Warranty** - Barcode scanning, serial duplicate prevention, auto 25-yr / 2-yr warranty calculation.
- [x] **Phase 6: Field Service (PWA)** - Technician job view, on-site photo upload, digital signature pad, timesheets.
- [x] **Phase 7: Support & Billing** - Serial warranty lookup, support tickets, auto-billing for out-of-warranty repairs.
- [x] **Phase 8: Analytics & Finance** - Executive line chart, profit-per-job modal, Excel export, shareable view.
- [x] **Phase 9: Frontend & Portal** - Odoo `#714B67` UI, CRM Kanban/List/Form, public rooftop savings calculator & case studies.
- [x] **Phase 10: Docker & Tests** - Docker Compose (backend, frontend, postgres, redis), 30 passing pytest tests.
- [x] **CRM to Warehouse Handover** - Auto-shift from `SURVEY_SCHEDULED` to `SURVEY_APPROVED`, "Send Items to Warehouse" modal & instant pick list generation.

## Next / Pending Items
- [ ] End-to-end verification of warehouse checklist barcode scanning flow with newly generated pick lists.
- [ ] Real-time WebSocket / SSE notifications for sales-to-warehouse dispatch alerts.
- [ ] Production deployment and SSL configuration.
