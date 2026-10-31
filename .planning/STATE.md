# GSD Project State: SunPower Solutions Solar Installation Management System

## Current State
- **Active Milestone**: v1.0
- **Status**: Setup & Planning Phase Completed. Ready for Phase 1.
- **Ponytail Mode**: `lite` (Strict YAGNI, standard library where possible, zero unnecessary dependencies, preserving all mandatory architecture).
- **Active Phase**: Phase 0 (Planning & Architecture Alignment)
- **Next Phase**: Phase 1 (Backend Skeleton, Database, Auth & Admin Setup)

## Invariants & Gates Checklist
- [ ] Gate 1: Survey Approval required for Quote Creation
- [ ] Gate 2: All required serials scanned before Order Delivery
- [ ] Gate 3: Auto-calculation of `warranty_end = delivered_on + warranty_years`
- [ ] Gate 4: Ticket auto-billing determined by `not in_warranty`
- [ ] Gate 5: Ticket closure requires customer confirmation
- [ ] Gate 6: Leads soft-delete only
- [ ] Gate 7: Audit log chatter for all status transitions
