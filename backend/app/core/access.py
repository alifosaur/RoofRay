"""Object-level access rules shared by routers. Admin sees everything."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Query

from app.models.lead import Lead
from app.models.order import Order, OrderStatus
from app.models.quote import Quote
from app.models.user import User, UserRole

FULFILMENT_STAGES = [
    OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.PACKED,
    OrderStatus.DISPATCHED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED,
]


def _forbid(detail: str):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Forbidden: {detail}")


def customer_id_of(user: User) -> int:
    return user.customer_profile.id if user.customer_profile else -1


def ensure_lead_access(lead: Lead, user: User) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.SALES:
        if lead.assigned_to_id != user.id:
            _forbid("this lead is assigned to another sales user")
        return
    if user.role == UserRole.CUSTOMER:
        if lead.customer_id != customer_id_of(user):
            _forbid("you can only view your own enquiry")
        return
    _forbid("technicians and warehouse staff cannot view CRM leads")


def scope_leads(query: Query, user: User) -> Query:
    if user.role == UserRole.SALES:
        return query.filter(Lead.assigned_to_id == user.id)
    if user.role == UserRole.CUSTOMER:
        return query.filter(Lead.customer_id == customer_id_of(user))
    if user.role != UserRole.ADMIN:
        _forbid("technicians and warehouse staff cannot view CRM leads")
    return query


def ensure_order_access(order: Order, user: User) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.CUSTOMER:
        if order.customer_id != customer_id_of(user):
            _forbid("you can only view your own order")
    elif user.role == UserRole.WAREHOUSE:
        if order.status not in FULFILMENT_STAGES:
            _forbid(f"warehouse can only view orders in fulfilment stages (current: {order.status.value})")
    elif user.role == UserRole.SALES:
        if not order.quote or not order.quote.lead or order.quote.lead.assigned_to_id != user.id:
            _forbid("this order belongs to another sales user's lead")
    else:
        _forbid("technicians access assigned installation jobs, not orders")


def scope_orders(query: Query, user: User) -> Query:
    if user.role == UserRole.CUSTOMER:
        return query.filter(Order.customer_id == customer_id_of(user))
    if user.role == UserRole.WAREHOUSE:
        return query.filter(Order.status.in_(FULFILMENT_STAGES))
    if user.role == UserRole.SALES:
        return query.join(Quote, Order.quote_id == Quote.id).join(Lead, Quote.lead_id == Lead.id).filter(Lead.assigned_to_id == user.id)
    if user.role != UserRole.ADMIN:
        _forbid("technicians access assigned installation jobs, not orders")
    return query


def ensure_quote_access(quote: Quote, user: User) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.SALES:
        if not quote.lead or quote.lead.assigned_to_id != user.id:
            _forbid("this quotation belongs to another sales user's lead")
    elif user.role == UserRole.CUSTOMER:
        if quote.customer_id != customer_id_of(user):
            _forbid("you can only view your own quotation")
    else:
        _forbid("technicians and warehouse staff cannot access quotations")


def scope_quotes(query: Query, user: User) -> Query:
    if user.role == UserRole.SALES:
        return query.join(Lead, Quote.lead_id == Lead.id).filter(Lead.assigned_to_id == user.id)
    if user.role == UserRole.CUSTOMER:
        return query.filter(Quote.customer_id == customer_id_of(user))
    if user.role != UserRole.ADMIN:
        _forbid("technicians and warehouse staff cannot access quotations")
    return query
