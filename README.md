# SunPower Solutions - Solar Installation Management System (ERP)

A comprehensive, production-grade Solar Installation Management System built for **SunPower Solutions** (~40 rooftop solar projects a month, 15 field technicians). The system manages the entire operational lifecycle from public web lead capture, site survey feasibility gating, dynamic BOM explosion, serialized warehouse dispatch, technician mobile PWA installation with on-site signature and test capture, automated warranty lifecycle, after-sales helpdesk with auto-invoicing, National Solar Subsidy tracking, and executive director dashboard with profit-per-job analytics.

The staff web portal is styled according to the **Odoo ERP UI/UX paradigm** (Odoo purple `#714B67`, teal accent `#017E84`, dense layout, statusbars with chevron stages, smart buttons, notebook tabs, inline editable lines, kanban/list/form/calendar views, and live chatter audit logs).

---

## 🏛 System Architecture & End-to-End Workflow

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                              1. PUBLIC WEBSITE & LEAD CAPTURE                          │
 │  • Public Enquiry Form (Name, Phone, City, Capacity, System Type)                     │
 │  • In-Memory Sliding-Window Rate Limiter & Round-Robin Sales Agent Assignment          │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Lead Status: NEW
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                               2. CRM & CALL QUALIFICATION                              │
 │  • Sales Call Checklist: Shadow-free Roof Area (sqft), Monthly Bill (₹), Grid Feasible │
 │  • Outcome: QUALIFIED or LOST (with mandatory reason, soft-deleted only)               │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Lead Status: QUALIFIED
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                3. SITE SURVEY & GATEWAY                                │
 │  • Sales schedules Survey -> Field Technician visits site                              │
 │  • Tech records: Roof Direction, Tilt (°), AC/DC Cable Distance, Mounting Feasibility  │
 │  • Manager/Admin Approval Gate: Quote creation returns HTTP 400 until survey APPROVED! │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Lead Status: SURVEY_APPROVED
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                             4. DYNAMIC BOM QUOTE EXPLOSION                             │
 │  • Select Package: 1kW-5kW On-Grid / Off-Grid (with Battery Bank)                      │
 │  • BOM Auto-Explosion: Panels, Inverters, ACDB/DCDB, Batteries, Structure, Earthing   │
 │  • Instant PDF Generation (ReportLab) -> Customer Accepts -> Converts to CONFIRMED Order│
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Order Status: CONFIRMED
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                            5. ORDER, PAYMENTS & PICK LISTS                             │
 │  • Record Advance/Full Payment: Cash, UPI, Bank Transfer, Cheque                       │
 │  • Automated Warehouse Pick List Generation & Stock Deductions                         │
 │  • Auto-creates Scheduled Installation Job for Field Technician Crew                   │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Order Status: PACKED
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                       6. SERIALIZED DISPATCH & WARRANTY GATE                           │
 │  • Warehouse Scans Hardware Barcodes (Inverters, Batteries, Charge Controllers)        │
 │  • Validation Gate: Rejects duplicate/already-assigned serials                         │
 │  • Delivery Gate: Delivery BLOCKED (HTTP 400) until 100% of serialized BOM items match│
 │  • Auto Warranty Engine: On DELIVERED, automatically calculates delivered_on and       │
 │    warranty_end (today + product warranty years, e.g. 20y panel, 2y inverter/battery)  │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Order Status: DELIVERED
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                     7. FIELD TECHNICIAN MOBILE INSTALLATION PWA                        │
 │  • Glove-Friendly Mobile UI for 15 Technicians (Today's Schedule)                      │
 │  • Captures: Start/Finish Times, Power Generation Test (kW Output Check)               │
 │  • Multiple Geotagged Site Photo Uploads (Panels, Inverter, Earthing, Net-meter)       │
 │  • Customer Digital Signature Canvas -> Marks Job COMPLETED                            │
 │  • Automatic Timesheet & Technician Hourly Payout Calculation                          │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Order Status: INSTALLED
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                          8. BILLING, SUBSIDIES & HELPDESK                              │
 │  • Final Tax Invoice & National Solar Subsidy Tracker (APPLIED -> APPROVED -> DISBURSED│
 │  • Customer Support Serial Lookup: Instant warranty status & remaining days            │
 │  • In-Warranty: Free Service | Out-of-Warranty: Auto-Generates Repair Invoice          │
 │  • Customer Confirmation Gate: Ticket cannot close without customer approval           │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                          9. DIRECTOR EXECUTIVE DASHBOARD                               │
 │  • Filter by Today / This Week / This Month / All Time                                 │
 │  • Profit per Job = Invoice Revenue - Hardware Cost - Technician Labor - BOS Costs     │
 │  • Real-time Profit Waterfall, Profitable vs Loss-making, Subsidy Pipeline, Low Stock  │
 │  • Excel Report (.xlsx) Export & Read-only Shareable Dashboard Link (Expiring Token)   │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ The 8 Business Invariants & Operational Gates

Every business rule is enforced strictly in the **backend service and data layer**, not merely via UI disabling:

1. **Lead Immutability & Rate Limiting**: Leads are never hard-deleted (`is_deleted` soft-delete only). Public web lead capture applies sliding-window IP rate limiting and round-robin sales agent auto-assignment.
2. **Sales Qualification Gate**: A sales call checklist must evaluate shadow-free area, monthly power bills, and grid suitability. Unfit leads are marked `LOST` with a mandatory reason.
3. **Survey Approval Gate**: Attempting to generate a quotation for a lead whose survey is not in `APPROVED` status raises `HTTP 400 Bad Request` (`"Cannot create quote: Site survey must be APPROVED first"`).
4. **BOM Template Explosion**: Creating a quote from a package template (e.g. 3 kW On-Grid or 5 kW Off-Grid with battery bank) automatically explodes the exact Bill of Materials into quote lines with live catalog prices and serialized item requirements.
5. **Dispatch Serialization Gate**: An order cannot be marked `DELIVERED` until **every required serialized BOM item** (inverters, batteries, charge controllers) has been scanned. Duplicate serial numbers or serials already assigned to other active orders are rejected with `HTTP 400 Bad Request`.
6. **Zero-Manual-Entry Warranty Engine**: When an order transitions to `DELIVERED`, the system automatically assigns `delivered_on = date.today()` and computes `warranty_end = delivered_on + product.warranty_years` (e.g., 20 years for panels, 2 years for inverters & batteries). Zero manual date inputs are accepted.
7. **Technician Mobile Installation Gate**: The technician PWA enforces capturing start/finish times, kW capacity confirmation, generation verification test (Yes/No), installation photo attachments, and a customer touch signature canvas before transitioning the job to `COMPLETED`. The timesheet hours and technician payout (`hours * hourly_rate`) are derived automatically.
8. **Helpdesk Warranty Gate & Auto-Billing**: Support lookup by customer phone, name, or hardware serial returns real-time warranty eligibility. If a ticket is created for an in-warranty serial, `billable` is set to `False` (free). If out-of-warranty, `billable` is set to `True`, and resolving the ticket automatically generates a repair invoice with parts and labor. A ticket cannot transition to `CLOSED` without explicit customer confirmation.

---

## 🛠 Tech Stack

### Backend
- **Framework**: Python 3.9+, FastAPI, Uvicorn (ASGI)
- **Data Validation & ORM**: Pydantic v2, SQLAlchemy 2.0, Alembic migrations
- **Database**: SQLite default (`sqlite:///./sunpower.db`), seamless PostgreSQL compatibility via `DATABASE_URL`
- **Authentication**: Firebase Admin SDK verification with dev bypass mode (`DEV_AUTH_BYPASS=True`) for offline development/testing
- **Role-Based Access Control**: 6 Distinct Roles (`admin`, `sales`, `technician`, `warehouse`, `support`, `accounts`) enforced via reusable `require_role(*roles)` FastAPI dependencies
- **PDF & Excel Reporting**: ReportLab PDF generation, openpyxl Excel streaming
- **Audit Logging**: Comprehensive `audit_logs` tracking every entity status change (`from_status` -> `to_status`, author, timestamp) powering the Odoo-style Chatter panel

### Frontend
- **Framework & Build**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with Odoo color palette (`#714B67` primary, `#017E84` teal accent, `#F9FAFB` canvas, Inter font)
- **Routing & State**: React Router v6, Context API for multi-role simulation
- **UI Components**:
  - `KanbanView`: Drag-and-drop pipeline powered by `@dnd-kit`
  - `ListView`: Sortable data grid with search, filter, and batch actions
  - `FormView`: Chevron statusbar stages, action buttons, smart stat buttons, notebook tabs, and inline editable line items
  - `Chatter`: Real-time audit history and activity feed
  - `TechnicianPWAPage`: Touch-optimized mobile PWA with camera file upload and `react-signature-canvas`
  - `DispatchScanner`: Live camera barcode scanning via `html5-qrcode` + manual barcode input
  - `DashboardCharts`: Interactive revenue, cost waterfall, and profit charts via `Recharts`

---

## 🚀 Quickstart Guide

### Option A: One-Command Docker Setup (Recommended)

Run the entire stack (PostgreSQL, Redis, FastAPI Backend with auto-seeding, and Nginx React Frontend) in isolated Docker containers with a single command:

```bash
docker compose up --build
```

- **Frontend App & Odoo Staff Portal**: [http://localhost:5173](http://localhost:5173) or [http://localhost:80](http://localhost:80)
- **FastAPI Backend & Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Database**: PostgreSQL 16 on `localhost:5432` (`sunpower_db`)
- **Cache/Queue**: Redis 7 on `localhost:6379`
- **Auto-Seeding**: The backend container automatically detects PostgreSQL and populates the complete 21-user, 40-product, 10-customer lifecycle dataset on first boot (`AUTO_SEED=true`).

To stop all containers:
```bash
docker compose down
```

To stop and remove persistent database volumes:
```bash
docker compose down -v
```

---

### Option B: Local Development Setup (Without Docker)

#### 1. Prerequisites
- Python 3.9 or higher
- Node.js 18 or higher (tested with Node 20 / 22 / 26)

#### 2. Backend Setup & Run

Open a terminal in the project root:

```bash
cd backend

# 1. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Seed realistic demo dataset (users, products, BOMs, 10 customer scenarios)
python seed.py

# 4. Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend will be live at `http://localhost:8000`.
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

#### 3. Frontend Setup & Run

Open a second terminal in the project root:

```bash
cd frontend

# 1. Install npm dependencies
npm install

# 2. Start the Vite dev server
npm run dev
```

The frontend will be live at `http://localhost:5173`.

---

## 👥 Demo Accounts & Roles

The system includes pre-seeded demo accounts with simulated Firebase authentication tokens. In the staff portal top navbar, a **Role Switcher** allows you to instantly test the UI from any persona:

| Role | Email | Auth Token (Dev Bypass) | Key Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@sunpower.com` | `admin_uid` | Full access across all apps, executive dashboard, user CRUD |
| **Sales** | `sales@sunpower.com` | `sales_uid` | CRM Leads, Call Checklist, Surveys, BOM Quotes, Orders |
| **Warehouse**| `warehouse@sunpower.com` | `warehouse_uid` | Stock management, Pick Lists, Barcode/Serial scanning, Dispatch |
| **Support** | `support@sunpower.com` | `support_uid` | Serial warranty lookup, Helpdesk ticketing, Repair invoicing |
| **Accounts** | `accounts@sunpower.com` | `accounts_uid` | Invoices, Payments, Subsidy paperwork, Technician payouts |
| **Technician** (15 total)| `tech1@sunpower.com` to `tech15@sunpower.com` | `tech_uid_1` to `tech_uid_15` | Site surveys, Mobile PWA installation jobs, timesheets |

---

## 🧪 Automated Test Suite

The backend includes a comprehensive `pytest` test suite covering every phase and business invariant.

```bash
cd backend
source venv/bin/activate
pytest
```

**Test Coverage Highlights**:
- `tests/test_phase1_auth.py`: Firebase token decoding, role enforcement (`require_role`), user CRUD.
- `tests/test_phase2_crm_survey.py`: Public lead capture, soft-delete, call qualification checklist, survey scheduling, and survey completion/approval.
- `tests/test_phase3_catalog_quote.py`: Product catalog, BOM explosion into quote lines, ReportLab quote PDF generation, quote acceptance.
- `tests/test_phase4_orders_inventory.py`: Order confirmation, advance payments, stock deductions, warehouse pick list generation.
- `tests/test_phase5_dispatch_warranty.py`: Dispatch serialization gate (asserts 400 on missing serial), duplicate serial rejection, automated warranty date computation on delivery.
- `tests/test_phase6_jobs.py`: Technician mobile workflow, photo upload, signature storage, power test verification, timesheet derivation.
- `tests/test_phase7_tickets_warranty.py`: Support lookup, in-warranty free ticket, out-of-warranty auto-repair invoicing, customer confirmation gate.
- `tests/test_phase8_reports_finance.py`: Subsidies, technician hourly payouts, profit-per-job calculation, Excel export, expiring shareable dashboard link.
- `tests/test_phase10_e2e_all_gates.py`: End-to-end integration test verifying all 8 business invariants in a single cohesive flow.

To build the frontend bundle:
```bash
cd frontend
npm run build
```

---

## 📖 Step-by-Step Interactive Demo Walkthrough

Follow this step-by-step path to experience the complete SunPower Solutions workflow:

### Step 1: Public Website & Enquiry (`/`)
1. Open `http://localhost:5173/` in your browser.
2. View the public-facing solar packages (1 kW to 5 kW On-Grid & Off-Grid).
3. Fill out the **Get a Free Rooftop Solar Quote** form (e.g. Name: *Rajesh Sharma*, Phone: *9810012345*, 3 kW On-Grid) and submit.
4. The system validates inputs, applies rate limiting, creates a lead, and round-robin assigns it to a sales agent.

### Step 2: Sales Qualification & Survey Scheduling (`/web/crm`)
1. Switch to the staff portal at `http://localhost:5173/web/crm`.
2. Notice the Odoo dark-purple top navbar (`#714B67`) and CRM Kanban pipeline (`New`, `Contacted`, `Qualified`, `Survey Scheduled`, `Survey Approved`, `Quoted`, `Won`).
3. Click on Rajesh Sharma's card to open the **Lead Form View**.
4. Fill out the **Call Checklist** tab: Shadow-free area (400 sqft), Monthly bill (₹5,500), Grid suitable: Yes. Click **Save Checklist** -> Lead moves to `QUALIFIED`.
5. Click **Schedule Survey**, pick a technician (e.g. *Ramesh Kumar - Tech 1*), and pick a survey date. Lead moves to `SURVEY_SCHEDULED`.

### Step 3: Verify the Survey Approval Gate (`/web/quotes`)
1. Try navigating directly to `/web/quotes` and creating a Quote for this lead.
2. **GATE ACTIVATION**: The system rejects quote creation with an alert: *"Cannot create quote: Site survey must be APPROVED first"*.
3. Navigate to `/web/surveys`, find the scheduled survey, and submit survey findings (Roof Direction: South, Tilt: 22°, Cable Distance: 15m).
4. Click **Approve Survey**. Lead status transitions to `SURVEY_APPROVED`.

### Step 4: BOM Quote Auto-Explosion & Acceptance (`/web/quotes`)
1. Go back to `/web/quotes` and click **New**.
2. Select Rajesh Sharma's lead and choose the template: **3 kW On-Grid System**.
3. Watch the system automatically explode the BOM:
   - 6x 540W Mono PERC Solar Panels
   - 1x 3kW String Inverter
   - 1x AC/DC Distribution Box
   - 1x Galvanized Iron Mounting Structure
   - 1x Chemical Earthing Kit & Cables
4. Click **Download PDF** to inspect the server-generated branded Quote PDF.
5. Click **Accept & Create Order**. An Order is created in `CONFIRMED` state, an automated Warehouse Pick List is generated, and an Installation Job is scheduled for the technician crew.

### Step 5: Warehouse Dispatch & Serial Barcode Gate (`/web/dispatch`)
1. Switch role to **Warehouse** in the top navbar and navigate to `/web/dispatch`.
2. Open the newly generated order. Notice the dispatch checklist showing missing serials.
3. Attempt to click **Confirm Delivery** immediately.
4. **GATE ACTIVATION**: Delivery is blocked (`HTTP 400`) because required serialized components (Inverter, Panels) have not been scanned.
5. Use either the **Camera Barcode Scanner** or the manual scanner input to scan the required inverter and panel serial numbers.
6. Attempt to scan an already-used serial: the system immediately rejects the duplicate scan.
7. Once all required serials are scanned, click **Confirm Delivery**.
8. **AUTOMATED WARRANTY ENGINE**: The system marks the order `DELIVERED`, records `delivered_on = today`, and automatically calculates `warranty_end = today + 20 years` for panels and `today + 2 years` for inverters.

### Step 6: Technician Mobile Installation PWA (`/pwa/tech`)
1. Open `http://localhost:5173/pwa/tech` on a mobile browser (or in Chrome DevTools Device Mode).
2. The technician sees their **Today's Assigned Jobs**.
3. Tap **Start Installation Job**.
4. Upload test photos of the inverter and panel array.
5. Run the power generation test: enter generated output (e.g. `2.8 kW`), mark **Power Generating: YES**.
6. Ask the customer to sign on the interactive touch signature canvas.
7. Tap **Complete Installation**.
8. The job transitions to `COMPLETED`, photo attachments and signatures are securely stored, and the system automatically calculates the timesheet and technician hourly labor payout.

### Step 7: Billing, Subsidy Tracking & After-Sales Helpdesk (`/web/accounting` & `/web/helpdesk`)
1. Switch role to **Accounts** and open `/web/accounting`:
   - Inspect the generated final tax invoice.
   - Track National Solar Subsidy status through its lifecycle: `APPLIED` -> `APPROVED` -> `DISBURSED` with government reference numbers.
   - Review technician payout entries derived from timesheet hours.
2. Switch role to **Support** and navigate to `/web/helpdesk`:
   - Enter an inverter serial or customer phone number into the **Instant Warranty Lookup**.
   - The system displays the customer, product name, installation date, warranty expiration date, and remaining days.
   - Create a service ticket:
     - For an **In-Warranty** component: `Billable` is automatically set to `False` (zero cost to customer).
     - For an **Out-of-Warranty** component: `Billable` is automatically set to `True`. When the technician resolves the ticket, a **Repair Invoice** is automatically created for parts and labor.
     - Verify the **Customer Confirmation Gate**: The ticket cannot be marked `CLOSED` until the customer confirms satisfaction.

### Step 8: Director Executive Dashboard & Expiring Share Link (`/web/dashboard`)
1. Switch role to **Admin** and navigate to `/web/dashboard`.
2. Filter analytics by **Today**, **This Week**, **This Month**, or **All Time**.
3. Review key metrics:
   - Total Invoiced Revenue vs. Collected Payments
   - Total Hardware Costs, Technician Payouts, and Net Margin
   - **Profit per Job Waterfall**: Analyzes revenue minus stock cost minus technician labor minus BOS costs.
   - Breakdown of Profitable vs. Loss-Making installations.
   - Active National Subsidy Pipeline.
   - Low Stock Inventory Alerts.
4. Click **Export to Excel (.xlsx)** to download the raw multi-sheet financial workbook.
5. Click **Generate Share Link**: Copies an expiring read-only dashboard link (`/shared/dashboard?token=...`) allowing board directors to inspect real-time metrics without logging in.

---

## 📁 Repository Structure

```text
├── backend/
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── core/               # App configuration, SQLite/PostgreSQL setup, Firebase auth & role guards
│   │   ├── models/             # SQLAlchemy 2.0 ORM models (21 tables)
│   │   ├── schemas/            # Pydantic v2 validation schemas
│   │   ├── routers/            # Clean REST API endpoints (Auth, CRM, Quotes, Orders, Dispatch, Jobs, Tickets, Finance, Reports)
│   │   ├── services/           # Core business logic & invariant gates
│   │   └── main.py             # FastAPI entrypoint, middleware, routes, exception handlers
│   ├── tests/                  # 16 Pytest test suites testing all 8 gates & e2e lifecycle
│   ├── uploads/                # Local storage for site photos and digital signature images
│   ├── seed.py                 # Comprehensive realistic demo data generator
│   └── requirements.txt        # Python backend dependencies
├── frontend/
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── api/                # Axios API client with simulated multi-role headers
│   │   ├── components/odoo/    # Reusable Odoo UI components (Navbar, HomeMenu, ControlPanel, FormView, ListView, KanbanView, Chatter, StatusBar, SmartButton)
│   │   ├── pages/              # Domain screens (CRM, Surveys, Quotes, Orders, Inventory, Dispatch, Jobs, Helpdesk, Accounting, Dashboard, Public Portal, Tech PWA)
│   │   ├── App.tsx             # Main router & role provider
│   │   └── main.tsx            # React DOM root
│   ├── package.json
│   └── tailwind.config.js      # Odoo color palette configuration
└── README.md                   # System documentation & walkthrough guide
```

---

## 📄 License
Proprietary software developed for **SunPower Solutions**. All rights reserved.
