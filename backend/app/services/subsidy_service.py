from typing import Optional
from sqlalchemy.orm import Session

from app.models.bom import BOMTemplate
from app.models.scheme import GovernmentScheme


def is_grid_connected(system_type: str) -> bool:
    return (system_type or "").strip().lower() == "on-grid"


def central_subsidy(db: Session, capacity_kw: float, system_type: str, state: Optional[str] = None) -> dict:
    """Subsidy from the active schemes table. Returns zeros (never a guess) when no scheme applies."""
    schemes = db.query(GovernmentScheme).filter(GovernmentScheme.is_active == True).all()
    central, topup, notes = 0.0, 0.0, []
    for s in schemes:
        if s.grid_connected_only and not is_grid_connected(system_type):
            continue
        is_national = "national" in (s.state or "").lower()
        if not is_national and not (state and state.lower() in (s.state or "").lower()):
            continue
        amount = min(capacity_kw, 2.0) * s.cfa_per_kw_first_2kw + max(0.0, min(capacity_kw, 3.0) - 2.0) * s.cfa_per_kw_3rd_kw
        if s.cfa_max:
            amount = min(amount, s.cfa_max)
        if is_national:
            central += amount
        else:
            topup += amount
        topup += capacity_kw * s.state_topup_per_kw
        notes.append(f"{s.name}: ₹{amount + capacity_kw * s.state_topup_per_kw:,.0f}")
    return {
        "central": round(central, 2),
        "state": round(topup, 2),
        "eligible": is_grid_connected(system_type) or any(not s.grid_connected_only for s in schemes),
        "breakdown": "; ".join(notes) if notes else "No active scheme applies to this system.",
    }


def package_price(db: Session, capacity_kw: float, system_type: str) -> Optional[float]:
    """Gross price of the closest catalogue BOM template, or None if the catalogue has none."""
    templates = db.query(BOMTemplate).filter(BOMTemplate.system_type == system_type).all()
    if not templates:
        return None
    t = min(templates, key=lambda t: abs(t.capacity_kw - capacity_kw))
    return round(sum(l.quantity * l.product.sale_price for l in t.lines), 2)
