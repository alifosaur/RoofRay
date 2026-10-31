# Project: SunPower Solutions - Solar Installation Management System

## Overview
A comprehensive, end-to-end Solar Installation Management System for "SunPower Solutions", a rooftop solar company managing ~40 projects/month and 15 technicians. The system manages the complete lifecycle from lead capture, site survey, quotation with BOM explosion, order & payments, serialized inventory dispatch, installation with mobile PWA signature/photos, warranty tracking, helpdesk ticketing with auto-billing, and a director dashboard with profit-per-job calculation.

## Tech Stack
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, Alembic
- **Database**: PostgreSQL with SQLite fallback via `DATABASE_URL` for frictionless local execution
- **Auth**: Firebase Authentication (Email/Password), verified via `firebase-admin` with local `users` role table. Roles: `sales`, `technician`, `warehouse`, `support`, `accounts`, `admin`. Role-based access control via `require_role(*roles)`
- **Background Tasks**: FastAPI `BackgroundTasks`
- **PDF & Reports**: ReportLab / Jinja2 PDF generator, Excel export via `openpyxl`
- **File Storage**: Local `/uploads` with support for photos & customer signature canvases
- **Frontend**: React (Vite + TypeScript), Tailwind CSS, React Router v6, TanStack Table, `@dnd-kit` (Kanban), FullCalendar, Recharts, `react-signature-canvas`, `html5-qrcode`, FontAwesome icons
- **UI Design System**: Odoo backend staff UX style (purple `#714B67`, teal `#017E84`, dense layout, Kanban/List/Form/Calendar/Graph switchers, chatter/audit trail) + Public customer quotation portal

## Core Business Gates & Invariants
1. **Survey Gate**: Quote creation is blocked (HTTP 400) unless survey status is `APPROVED`.
2. **Serial Dispatch Gate**: Order delivery is blocked unless every serialized product line in the BOM (inverters, batteries, charge controllers) has an assigned, verified serial number. Duplicate and re-assigned serials are strictly rejected.
3. **Auto Warranty**: On delivery, `delivered_on` and `warranty_end` are auto-calculated from product warranty specs (e.g. Inverter/Battery: 2 yrs, Panels: 20 yrs). Zero manual date inputs.
4. **Ticket Auto-Billing**: Support tickets linked to serialized items automatically determine `billable = not in_warranty`. Out-of-warranty repairs auto-generate repair invoices on resolution. Cannot close without customer confirmation.
5. **Soft-Delete Only**: Leads must never be permanently deleted.
6. **Immutable Audit Trail**: All status transitions generate `audit_log` records to power the Odoo-style chatter.
