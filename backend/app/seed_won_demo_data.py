"""
Seed exactly 25 rich demo records in the WON list with complete quotes, orders, jobs, payments, serials, and subsidies.
"""
import sys
from datetime import datetime, timedelta, date

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.lead import Lead, LeadStatus
from app.models.quote import Quote, QuoteLine, QuoteStatus
from app.models.order import Order, OrderStatus
from app.models.job import InstallationJob, JobStatus, Timesheet
from app.models.payment import Payment, PaymentMethod
from app.models.serial import SerialItem, SerialStatus
from app.models.finance import SubsidyRecord, SubsidyStatus, Invoice, InvoiceType, InvoiceStatus
from app.models.bom import BOMTemplate
from app.models.expense import Expense

NEW_WON_MEMBERS = [
    {
        "name": "Rajesh Sharma",
        "phone": "9820145672",
        "email": "rajesh.sharma@example.com",
        "address": "Flat 402, Godrej Woods, Sector 43",
        "city": "Noida",
        "state": "Uttar Pradesh",
        "pincode": "201303",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 35, "roof_width": 25,
        "template_id": 3,
        "days_ago": 28,
        "is_fully_paid": True,
    },
    {
        "name": "Priya Venkatesh",
        "phone": "9845123980",
        "email": "priya.venkatesh@example.com",
        "address": "Villa 14, Prestige Silver Oak, Whitefield",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560066",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 40, "roof_width": 30,
        "template_id": 5,
        "days_ago": 26,
        "is_fully_paid": True,
    },
    {
        "name": "Amitav Sen",
        "phone": "9830987123",
        "email": "amitav.sen@example.com",
        "address": "88/2 Ballygunge Circular Road",
        "city": "Kolkata",
        "state": "West Bengal",
        "pincode": "700019",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 30, "roof_width": 20,
        "template_id": 2,
        "days_ago": 25,
        "is_fully_paid": True,
    },
    {
        "name": "Sunita Patil",
        "phone": "9822456789",
        "email": "sunita.patil@example.com",
        "address": "Bungalow 7, Baner Hills Society",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411045",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 32, "roof_width": 24,
        "template_id": 3,
        "days_ago": 24,
        "is_fully_paid": True,
    },
    {
        "name": "Vikramaditya Rao",
        "phone": "9849012345",
        "email": "vikram.rao@example.com",
        "address": "Plot 112, Jubilee Hills, Road No. 36",
        "city": "Hyderabad",
        "state": "Telangana",
        "pincode": "500033",
        "property_type": "Commercial",
        "roof_type": "Tin / Metal Sheet",
        "roof_length": 60, "roof_width": 40,
        "template_id": 5,
        "days_ago": 22,
        "is_fully_paid": True,
    },
    {
        "name": "Deepa Nair",
        "phone": "9447123456",
        "email": "deepa.nair@example.com",
        "address": "Manorama Junction, Panampilly Nagar",
        "city": "Kochi",
        "state": "Kerala",
        "pincode": "682036",
        "property_type": "Residential",
        "roof_type": "Tiled / Slanted",
        "roof_length": 28, "roof_width": 20,
        "template_id": 2,
        "days_ago": 21,
        "is_fully_paid": True,
    },
    {
        "name": "Rohan Kulkarni",
        "phone": "9823456712",
        "email": "rohan.kulkarni@example.com",
        "address": "Flat 1204, Lodha Belmondo",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "412101",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 35, "roof_width": 25,
        "template_id": 4,
        "days_ago": 20,
        "is_fully_paid": True,
    },
    {
        "name": "Meera Iyer",
        "phone": "9841234567",
        "email": "meera.iyer@example.com",
        "address": "15 4th Cross Street, Gandhi Nagar, Adyar",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600020",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 30, "roof_width": 20,
        "template_id": 3,
        "days_ago": 18,
        "is_fully_paid": True,
    },
    {
        "name": "Karthik Subramanian",
        "phone": "9880123456",
        "email": "karthik.subramanian@example.com",
        "address": "452 14th Main, HSR Layout Sector 4",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560102",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 36, "roof_width": 24,
        "template_id": 3,
        "days_ago": 17,
        "is_fully_paid": True,
    },
    {
        "name": "Ananya Deshmukh",
        "phone": "9867123456",
        "email": "ananya.deshmukh@example.com",
        "address": "702 Sea Breeze Apartments, Bandra West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400050",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 25, "roof_width": 18,
        "template_id": 1,
        "days_ago": 16,
        "is_fully_paid": True,
    },
    {
        "name": "Suresh Chandra Gupta",
        "phone": "9414012345",
        "email": "suresh.gupta@example.com",
        "address": "B-24 Malviya Nagar, JLN Marg",
        "city": "Jaipur",
        "state": "Rajasthan",
        "pincode": "302017",
        "property_type": "Commercial",
        "roof_type": "Concrete / Flat",
        "roof_length": 55, "roof_width": 35,
        "template_id": 5,
        "days_ago": 15,
        "is_fully_paid": True,
    },
    {
        "name": "Pooja Mehta",
        "phone": "9879123456",
        "email": "pooja.mehta@example.com",
        "address": "A-304 Satyagrah Chhavani, Satellite",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380015",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 38, "roof_width": 26,
        "template_id": 3,
        "days_ago": 13,
        "is_fully_paid": True,
    },
    {
        "name": "Arvind Singhania",
        "phone": "9810123456",
        "email": "arvind.singhania@example.com",
        "address": "12 Barakhamba Road, Connaught Place",
        "city": "New Delhi",
        "state": "Delhi",
        "pincode": "110001",
        "property_type": "Commercial",
        "roof_type": "Concrete / Flat",
        "roof_length": 65, "roof_width": 40,
        "template_id": 5,
        "days_ago": 12,
        "is_fully_paid": True,
    },
    {
        "name": "Kavita Reddy",
        "phone": "9848123456",
        "email": "kavita.reddy@example.com",
        "address": "Villa 8, Emaar Boulder Hills, Gachibowli",
        "city": "Hyderabad",
        "state": "Telangana",
        "pincode": "500032",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 42, "roof_width": 28,
        "template_id": 4,
        "days_ago": 10,
        "is_fully_paid": True,
    },
    {
        "name": "Manoj Bhatia",
        "phone": "9818123456",
        "email": "manoj.bhatia@example.com",
        "address": "House 104, Sector 15, Part 2",
        "city": "Gurugram",
        "state": "Haryana",
        "pincode": "122001",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 35, "roof_width": 22,
        "template_id": 3,
        "days_ago": 9,
        "is_fully_paid": True,
    },
    {
        "name": "Divya Menon",
        "phone": "9446123456",
        "email": "divya.menon@example.com",
        "address": "Flat 5C, Skyline Imperial Gardens",
        "city": "Kozhikode",
        "state": "Kerala",
        "pincode": "673001",
        "property_type": "Residential",
        "roof_type": "Tiled / Slanted",
        "roof_length": 26, "roof_width": 18,
        "template_id": 2,
        "days_ago": 7,
        "is_fully_paid": True,
    },
    {
        "name": "Alok Agarwal",
        "phone": "9839123456",
        "email": "alok.agarwal@example.com",
        "address": "52 Gomti Nagar, Vibhuti Khand",
        "city": "Lucknow",
        "state": "Uttar Pradesh",
        "pincode": "226010",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 34, "roof_width": 24,
        "template_id": 3,
        "days_ago": 6,
        "is_fully_paid": True,
    },
    {
        "name": "Ritu Saxena",
        "phone": "9826123456",
        "email": "ritu.saxena@example.com",
        "address": "Bungalow 18, Arera Colony E-3",
        "city": "Bhopal",
        "state": "Madhya Pradesh",
        "pincode": "462016",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 30, "roof_width": 20,
        "template_id": 8,
        "days_ago": 4,
        "is_fully_paid": True,
    },
    {
        "name": "Harish Nambiar",
        "phone": "9840123456",
        "email": "harish.nambiar@example.com",
        "address": "22 TTK Road, Alwarpet",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600018",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 38, "roof_width": 25,
        "template_id": 4,
        "days_ago": 3,
        "is_fully_paid": False,
    },
    {
        "name": "Swati Chawla",
        "phone": "9811123456",
        "email": "swati.chawla@example.com",
        "address": "D-80 Hauz Khas",
        "city": "New Delhi",
        "state": "Delhi",
        "pincode": "110016",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 32, "roof_width": 22,
        "template_id": 3,
        "days_ago": 2,
        "is_fully_paid": False,
    },
    {
        "name": "Pradeep Hegde",
        "phone": "9845987654",
        "email": "pradeep.hegde@example.com",
        "address": "No 12, 8th Main, Malleshwaram",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560003",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length": 45, "roof_width": 30,
        "template_id": 5,
        "days_ago": 1,
        "is_fully_paid": False,
    },
]


def seed_won_members():
    db = SessionLocal()
    try:
        current_won = db.query(Lead).filter(Lead.status == LeadStatus.WON).count()
        print(f"Current won leads: {current_won}")
        if current_won >= 25:
            print(f"Already have {current_won} won leads. Skipping seed.")
            return

        needed = 25 - current_won
        print(f"Adding {needed} new won leads and orders...")

        sales_user = db.query(User).filter(User.role == UserRole.SALES).first()
        tech_user = db.query(User).filter(User.role == UserRole.TECHNICIAN, User.is_active == True).first()
        if not tech_user:
            tech_user = db.query(User).filter(User.role == UserRole.TECHNICIAN).first()

        now = datetime(2026, 11, 1, 12, 0, 0)
        existing_q_nums = [int(q.quote_number.split("-")[-1]) for q in db.query(Quote).all() if "-" in q.quote_number and q.quote_number.split("-")[-1].isdigit()]
        max_quote_id = max(existing_q_nums) if existing_q_nums else 0

        existing_o_nums = [int(o.order_number.split("-")[-1]) for o in db.query(Order).all() if "-" in o.order_number and o.order_number.split("-")[-1].isdigit()]
        max_order_id = max(existing_o_nums) if existing_o_nums else 0

        for idx, m in enumerate(NEW_WON_MEMBERS[:needed]):
            quote_num_int = max_quote_id + idx + 1
            order_num_int = max_order_id + idx + 1
            order_num = f"SO-2026-{order_num_int:04d}"
            quote_num = f"QT-2026-{quote_num_int:04d}"
            confirmed_dt = now - timedelta(days=m["days_ago"], hours=idx % 8)

            # 1. Customer
            cust = Customer(
                name=m["name"],
                phone=m["phone"],
                email=m["email"],
                address=m["address"],
                city=m["city"],
                pincode=m["pincode"],
            )
            db.add(cust)
            db.flush()

            # 2. Template
            template = db.query(BOMTemplate).filter(BOMTemplate.id == m["template_id"]).first()
            if not template:
                template = db.query(BOMTemplate).first()

            # 3. Lead
            lead = Lead(
                name=m["name"],
                phone=m["phone"],
                email=m["email"],
                address=m["address"],
                city=m["city"],
                state=m["state"],
                pincode=m["pincode"],
                property_type=m["property_type"],
                roof_type=m["roof_type"],
                roof_area_sqft=float(m["roof_length"] * m["roof_width"]),
                shadow_free_area_sqft=float(int(m["roof_length"] * m["roof_width"] * 0.85)),
                required_capacity=template.capacity_kw if template else 3.0,
                system_type=template.system_type if template else "On-Grid",
                status=LeadStatus.WON,
                customer_id=cust.id,
                assigned_to_id=sales_user.id if sales_user else None,
                created_at=confirmed_dt - timedelta(days=3),
                updated_at=confirmed_dt,
            )
            db.add(lead)
            db.flush()

            # 4. Quote
            subtotal = sum(l.quantity * (l.product.sale_price if l.product else 10000.0) for l in template.lines)
            tax_amount = round(subtotal * 0.138, 2)
            subsidy_amount = 0.0
            if template.system_type == "On-Grid":
                if template.capacity_kw <= 1.0:
                    subsidy_amount = 30000.0
                elif template.capacity_kw <= 2.0:
                    subsidy_amount = 60000.0
                else:
                    subsidy_amount = 78000.0
            total_amount = round(subtotal + tax_amount - subsidy_amount, 2)

            quote = Quote(
                quote_number=quote_num,
                lead_id=lead.id,
                customer_id=cust.id,
                template_id=template.id,
                status=QuoteStatus.ACCEPTED,
                subtotal=subtotal,
                tax_amount=tax_amount,
                subsidy_amount=subsidy_amount,
                total_amount=total_amount,
                created_at=confirmed_dt - timedelta(days=1),
                updated_at=confirmed_dt,
            )
            db.add(quote)
            db.flush()

            for tl in template.lines:
                price = tl.product.sale_price if tl.product else 10000.0
                ql = QuoteLine(
                    quote_id=quote.id,
                    product_id=tl.product_id,
                    quantity=tl.quantity,
                    unit_price=price,
                    subtotal=round(tl.quantity * price, 2),
                )
                db.add(ql)
            db.flush()

            # 4. Order
            is_paid = m["is_fully_paid"]
            paid_amount = total_amount if is_paid else round(total_amount * 0.5, 2)
            order_status = OrderStatus.CLOSED if is_paid else OrderStatus.INSTALLED

            order = Order(
                order_number=order_num,
                quote_id=quote.id,
                customer_id=cust.id,
                status=order_status,
                total_amount=total_amount,
                paid_amount=paid_amount,
                confirmed_at=confirmed_dt,
                delivered_at=confirmed_dt + timedelta(days=2),
                installed_at=confirmed_dt + timedelta(days=4),
                created_at=confirmed_dt,
                updated_at=confirmed_dt + timedelta(days=4),
                notes=f"Accepted quotation {quote.quote_number}. Installation completed."
            )
            db.add(order)
            db.flush()

            # 5. Job & Timesheet
            hours = 8.0 if template.capacity_kw <= 2.0 else (12.0 if template.capacity_kw <= 4.0 else 16.0)
            rate = (tech_user.hourly_rate if tech_user and tech_user.hourly_rate > 0 else 500)
            tech_cost = round(hours * rate, 2)

            job = InstallationJob(
                order_id=order.id,
                technician_id=tech_user.id if tech_user else 1,
                status=JobStatus.COMPLETED,
                scheduled_date=confirmed_dt + timedelta(days=3),
                started_at=confirmed_dt + timedelta(days=3, hours=9),
                finished_at=confirmed_dt + timedelta(days=3, hours=9 + int(hours)),
                confirmed_capacity_kw=template.capacity_kw,
                power_generating=True,
                created_at=confirmed_dt,
                updated_at=confirmed_dt + timedelta(days=4),
            )
            db.add(job)
            db.flush()

            ts = Timesheet(
                technician_id=tech_user.id if tech_user else 1,
                job_id=job.id,
                hours=hours,
                hourly_rate=rate,
                total_cost=tech_cost,
                start_time=job.started_at,
                finish_time=job.finished_at,
                created_at=job.finished_at,
            )
            db.add(ts)

            # 6. Payment
            adv_amt = round(total_amount * 0.5, 2)
            p1 = Payment(
                order_id=order.id,
                amount=adv_amt,
                method=PaymentMethod.UPI,
                transaction_ref=f"FIN-50-ORD{order_num}",
                recorded_by_id=sales_user.id if sales_user else 1,
                created_at=confirmed_dt,
            )
            db.add(p1)

            if is_paid:
                bal_amt = round(total_amount - adv_amt, 2)
                p2 = Payment(
                    order_id=order.id,
                    amount=bal_amt,
                    method=PaymentMethod.BANK,
                    transaction_ref=f"FIN-BAL-ORD{order_num}",
                    recorded_by_id=sales_user.id if sales_user else 1,
                    created_at=confirmed_dt + timedelta(days=4),
                )
                db.add(p2)

            # 7. Serial Items
            for ql in quote.lines:
                if ql.product and ql.product.is_serialised:
                    for s_idx in range(min(ql.quantity, 2)):
                        s = SerialItem(
                            serial_no=f"{ql.product.sku}-{order_num}-{s_idx+1:02d}",
                            product_id=ql.product_id,
                            order_id=order.id,
                            customer_id=cust.id,
                            status=SerialStatus.DELIVERED,
                            scanned_at=confirmed_dt + timedelta(days=1),
                            delivered_on=order.delivered_at.date(),
                            warranty_end=(order.delivered_at + timedelta(days=365 * ql.product.warranty_years)).date(),
                            created_at=confirmed_dt + timedelta(days=1),
                        )
                        db.add(s)

            # 8. Subsidy Record
            if template.system_type == "On-Grid":
                sub = SubsidyRecord(
                    order_id=order.id,
                    application_no=f"PMSG-2026-{order_num_int:04d}",
                    portal_name="PM Surya Ghar National Portal",
                    status=SubsidyStatus.DISBURSED if is_paid else SubsidyStatus.APPROVED,
                    eligible_amount=subsidy_amount,
                    sanctioned_amount=subsidy_amount,
                    disbursed_amount=subsidy_amount if is_paid else 0.0,
                    applied_date=(confirmed_dt + timedelta(days=1)).date(),
                    approved_date=(confirmed_dt + timedelta(days=3)).date(),
                    disbursed_date=(confirmed_dt + timedelta(days=5)).date() if is_paid else None,
                    created_at=confirmed_dt,
                )
                db.add(sub)

            # 9. Invoice
            inv = Invoice(
                invoice_number=f"INV-{order_num}",
                order_id=order.id,
                customer_id=cust.id,
                invoice_type=InvoiceType.SALES,
                status=InvoiceStatus.PAID if is_paid else InvoiceStatus.ISSUED,
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                created_at=confirmed_dt + timedelta(days=4),
            )
            db.add(inv)

            # 10. Optional job liaison expense for some orders
            if idx % 4 == 0:
                exp = Expense(
                    order_id=order.id,
                    category="LIAISON",
                    amount=850.0,
                    description=f"DISCOM Net Metering inspection fee for {order_num}",
                    expense_date=confirmed_dt.date(),
                )
                db.add(exp)

        db.commit()
        total_won = db.query(Lead).filter(Lead.status == LeadStatus.WON).count()
        total_orders = db.query(Order).filter(Order.status != OrderStatus.DRAFT).count()
        print(f"Successfully seeded! Total won leads: {total_won}, Total orders: {total_orders}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_won_members()
