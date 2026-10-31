# Project Roadmap: SunPower Solutions Solar Installation Management System

## Milestone v1.0 - Core Implementation

### Phase 1: Foundation & Authentication
- **Goal**: Set up FastAPI backend architecture, SQLAlchemy 2.0 configuration (PostgreSQL + SQLite fallback), Alembic migrations, Firebase auth verification with local `users` role table (`sales`, `technician`, `warehouse`, `support`, `accounts`, `admin`), `require_role` dependency, seed script foundation for admin user, and CORS/uploads configuration.
- **Verification**: Run FastAPI, verify `/docs`, test `/auth/me` with role enforcement, and seed initial admin.

### Phase 2: CRM, Call Checklists, Site Surveys & Survey Gate
- **Goal**: Lead management (public unauthenticated lead capture form API with rate limiting, round-robin assignment, soft delete), call checklist (shadow-free area, bills, grid check, LOST reason), site surveys (roof direction, tilt, cable distance), survey approval workflow, and survey gate enforcement on quote creation.
- **Verification**: Run API tests creating lead, qualifying, scheduling survey, approving survey, and attempting quote creation before and after approval.

### Phase 3: Catalog, BOM Explosion & Quotations (with PDF)
- **Goal**: Product management (hardware/service, serialized flags, warranty years, cost & sale prices), BOM templates (3kW/5kW On-Grid & Off-Grid) and BOM lines, quote creation with automatic BOM explosion into quote lines, PDF generation (Jinja2/ReportLab), quote acceptance transition.
- **Verification**: Generate quotes, verify BOM exploded quantities and prices, download generated quote PDF, accept quote.

### Phase 4: Orders, Payments, Inventory & Pick Lists
- **Goal**: Order lifecycle (`DRAFT`, `CONFIRMED`, `PACKED`, `DISPATCHED`, `DELIVERED`, `INSTALLED`, `CLOSED`), payment recording (advance/full via cash, UPI, bank, cheque), inventory stock movements (purchases & issues), auto-generation of warehouse pick lists on order confirmation.
- **Verification**: Transition quote to confirmed order, record payment, check warehouse pick list generation and stock deductions.

### Phase 5: Serialized Item Dispatch & Automated Warranty Engine
- **Goal**: Serialized item tracking (`serial_items` table linked to product, customer, order), barcode/serial scanning API with duplicate prevention, dispatch gate enforcement (blocking delivery until all required BOM serialized items are scanned), automatic computation of `delivered_on` and `warranty_end` upon delivery.
- **Verification**: Attempt delivery with missing serial (assert 400), scan valid serials, attempt duplicate serial scan (assert 400), confirm delivery and verify computed warranty dates.

### Phase 6: Field Service Installation (Mobile PWA Backend)
- **Goal**: Installation job lifecycle (`my-schedule`), site photos upload, customer digital signature upload, start/finish timesheet derivation, power generation verification check, job completion workflow.
- **Verification**: Complete an installation job with sample photo and signature data, verify job status `COMPLETED` and timesheet hours generated.

### Phase 7: After-Sales Support, Warranty Lookup & Automated Repair Billing
- **Goal**: Customer/serial support lookup endpoint (retrieves customer, product serial, warranty status, days left, service history), ticket lifecycle (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CUSTOMER_CONFIRMED`, `CLOSED`), automated `billable = not in_warranty` evaluation, automated repair invoice generation for billable tickets, customer confirmation gate for closure.
- **Verification**: Test in-warranty serial lookup (verify non-billable), test out-of-warranty serial lookup (verify billable + repair invoice generated on resolution).

### Phase 8: Financial Management, Executive Dashboard & Exports
- **Goal**: Invoices and invoice lines, subsidy paperwork tracking (`NOT_APPLIED`, `APPLIED`, `APPROVED`, `DISBURSED`), technician payouts (`hours * hourly_rate`), director dashboard metrics with date range filtering (today, week, month), profit-per-job calculation (`revenue - stock_cost - technician_payout - other_costs`), profitable vs loss-making analysis, low stock alerts, read-only shareable dashboard link with expiring JWT token, Excel export via `openpyxl`.
- **Verification**: Query dashboard API across date ranges, generate Excel export file, test expiring shareable link.

### Phase 9: React + Vite Frontend (Odoo UI & Mobile PWA & Public Portal)
- **Goal**:
  1. Odoo staff shell: Top navbar (`#714B67`), Home Menu grid, Control Panel, breadcrumbs, view switchers.
  2. Generic reusable views: `KanbanView` (@dnd-kit), `ListView` (TanStack Table), `FormView` (arrow-shaped statusbar, smart buttons, notebook tabs, inline order lines), `Chatter` (audit log).
  3. Domain screens: CRM pipeline, Survey Calendar, Sales Quotes, Inventory with Serial numbers, Dispatch Scanner (camera/manual), Field Service, Helpdesk Kanban, Director Dashboard (Recharts).
  4. Technician PWA: Mobile-first responsive view with touch targets, today's jobs, camera capture, signature pad.
  5. Public Website: Odoo website style with hero, packages table (1-5 kW On/Off-Grid), and public quote inquiry form.
- **Verification**: Launch Vite frontend dev server, navigate all modules, verify responsive layouts and backend API integrations.

### Phase 10: Notifications, Automated Test Suite, Seeding, README & Final Polish [COMPLETED]
- **Goal**:
  1. Internal notifications system (systray badge and notifications feed).
  2. Comprehensive `seed.py` (admin, users for each role, 3kW & 5kW templates, 30+ products, 10 customers across stages, 40+ serial items, sample warranty cases).
  3. `pytest` test suite covering all critical business gates.
  4. Complete documentation: `README.md`, setup instructions, architecture diagram, and end-to-end walk-through script.
- **Verification**: Run `pytest` end-to-end (16 passed in 1.5s), execute `python backend/seed.py` (successfully seeded 21 users, 40 products, 4 BOM templates, 10 full lifecycle customers, 36 serials), test clean spin-up. Status: 100% verified.

