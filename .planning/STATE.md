# GSD Project State: SunPower Solutions Solar Installation Management System

## Current State
- **Active Milestone**: v1.0
- **Status**: Phases 1 through 9 Completed & Verified. Entering Phase 10 (Seed Demo Data, E2E Verification & Documentation).
- **Ponytail Mode**: `lite` (Strict YAGNI, standard library where possible, zero unnecessary dependencies, preserving all mandatory architecture).
- **Active Phase**: Phase 9 -> Phase 10
- **Next Phase**: Phase 10 (Demo Seeder, Full Test Suite, Walkthrough & README)

## Invariants & Gates Checklist
- [x] Gate 1: Survey Approval required for Quote Creation (HTTP 400 blocked otherwise)
- [x] Gate 2: All required serials scanned before Order Delivery (HTTP 400 blocked otherwise)
- [x] Gate 3: Auto-calculation of `warranty_end = delivered_on + warranty_years` (zero manual date entry)
- [x] Gate 4: Ticket auto-billing determined by `not in_warranty` (repair invoice auto-generated)
- [x] Gate 5: Ticket closure requires customer confirmation (HTTP 400 blocked otherwise)
- [x] Gate 6: Leads soft-delete only (`is_deleted=True`)
- [x] Gate 7: Audit log chatter for all status transitions (lead, quote, order, job, ticket)
- [x] Gate 8: Mobile-first Technician PWA with glove-friendly touch targets, camera photos, and on-screen signature canvas
