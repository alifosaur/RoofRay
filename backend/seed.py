import sys
import os
from datetime import datetime, date, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import SessionLocal, engine, Base
import app.models
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.lead import Lead, LeadStatus, CallChecklist
from app.models.survey import Survey, SurveyStatus
from app.models.product import Product, ProductCategory
from app.models.bom import BOMTemplate, BOMLine
from app.models.quote import Quote, QuoteLine, QuoteStatus
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentMethod
from app.models.inventory import StockMovement, MovementType, PickList, PickListLine
from app.models.serial import SerialItem, SerialStatus
from app.models.job import InstallationJob, JobStatus, JobPhoto, JobSignature, Timesheet
from app.models.ticket import Ticket, TicketStatus
from app.models.finance import Invoice, InvoiceType, InvoiceLine, InvoiceStatus, SubsidyRecord, SubsidyStatus, TechnicianPayout
from app.models.audit import AuditLog


def run_seed():
    print("Initializing SunPower Solutions Demo Seeder...")
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE customers ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            conn.commit()
        except Exception:
            pass
    db = SessionLocal()

    # 1. SEED USERS & 15-TECHNICIAN CREW
    print("--- Seeding Staff & Technicians ---")
    core_users = [
        {"email": "admin@sunpower.com", "full_name": "Rajesh Singhania (Director & Admin)", "role": UserRole.ADMIN, "uid": "admin_uid", "phone": "+91 98110 00001"},
        {"email": "sales@sunpower.com", "full_name": "Rohan Sharma (Sr. Sales)", "role": UserRole.SALES, "uid": "sales_uid", "phone": "+91 98110 00002"},
        {"email": "sales2@sunpower.com", "full_name": "Ananya Joshi (Sales)", "role": UserRole.SALES, "uid": "sales2_uid", "phone": "+91 98110 00003"},
        {"email": "warehouse@sunpower.com", "full_name": "Deepak Kumar (Warehouse Lead)", "role": UserRole.WAREHOUSE, "uid": "warehouse_uid", "phone": "+91 98110 00004"},
        {"email": "customer@sunpower.com", "full_name": "Vikram Malhotra (Customer)", "role": UserRole.CUSTOMER, "uid": "customer_uid", "phone": "+91 98110 00007"},
    ]

    # Add 15 Technicians
    tech_names = [
        "Amit Verma (Lead)", "Sunil Yadav", "Vikas Rathore", "Manoj Tiwari",
        "Suresh Patil", "Ravi Shankar", "Dinesh Rawat", "Pankaj Mehra",
        "Gaurav Chauhan", "Kunal Sengupta", "Rahul Deshmukh", "Nitin Solanki",
        "Ajay Bisht", "Sachin Kale", "Mahesh Hegde"
    ]

    all_users = list(core_users)
    for idx, name in enumerate(tech_names, start=1):
        uid = "tech_uid" if idx == 1 else f"tech_{idx}_uid"
        all_users.append({
            "email": f"tech{idx}@sunpower.com" if idx > 1 else "tech@sunpower.com",
            "full_name": f"{name} (Tech #{idx})",
            "role": UserRole.TECHNICIAN,
            "uid": uid,
            "phone": f"+91 98220 {idx:05d}",
        })

    user_map = {}
    for u in all_users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            user = User(
                email=u["email"],
                full_name=u["full_name"],
                role=u["role"],
                firebase_uid=u["uid"],
                phone=u["phone"],
                hourly_rate=600 if u["role"] == UserRole.TECHNICIAN else 0,
                is_active=True
            )
            db.add(user)
            db.flush()
            user_map[u["role"]] = user_map.get(u["role"], []) + [user]
        else:
            # Migrate any deprecated roles to ADMIN
            if existing.role not in [UserRole.CUSTOMER, UserRole.SALES, UserRole.TECHNICIAN, UserRole.WAREHOUSE, UserRole.ADMIN]:
                existing.role = UserRole.ADMIN
                db.flush()
            user_map[u["role"]] = user_map.get(u["role"], []) + [existing]

    admin_user = user_map[UserRole.ADMIN][0]
    sales_user = user_map[UserRole.SALES][0]
    lead_tech = user_map[UserRole.TECHNICIAN][0]
    warehouse_user = user_map[UserRole.WAREHOUSE][0]
    customer_user = user_map[UserRole.CUSTOMER][0]
    support_user = admin_user
    accounts_user = admin_user

    # 2. SEED 30+ PRODUCTS
    print("--- Seeding 30+ Products & Hardware Catalog ---")
    products_catalog = [
        # Panels (20 yr warranty, serialised high-wattage panels)
        {"sku": "SP-PNL-540W", "name": "540W Mono PERC Half-Cut Solar Panel", "category": ProductCategory.PANEL, "is_serialised": True, "warranty_years": 20, "cost_price": 10500, "sale_price": 14000, "stock": 180, "min_stock": 30},
        {"sku": "SP-PNL-450W", "name": "450W Mono PERC Solar Panel", "category": ProductCategory.PANEL, "is_serialised": False, "warranty_years": 20, "cost_price": 8800, "sale_price": 12000, "stock": 95, "min_stock": 20},
        {"sku": "SP-PNL-550W-BF", "name": "550W Bi-Facial Dual Glass Solar Panel", "category": ProductCategory.PANEL, "is_serialised": False, "warranty_years": 20, "cost_price": 12500, "sale_price": 16500, "stock": 60, "min_stock": 15},
        {"sku": "SP-PNL-580W-TC", "name": "580W N-Type TopCon High Output Panel", "category": ProductCategory.PANEL, "is_serialised": False, "warranty_years": 20, "cost_price": 14000, "sale_price": 18500, "stock": 45, "min_stock": 10},
        {"sku": "SP-PNL-330W-POLY", "name": "330W Polycrystalline Solar Panel", "category": ProductCategory.PANEL, "is_serialised": False, "warranty_years": 20, "cost_price": 6200, "sale_price": 8500, "stock": 5, "min_stock": 10},

        # Inverters (2 yr warranty, serialised)
        {"sku": "SP-INV-1KW-OG", "name": "1 kW Smart Grid-Tie On-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 18000, "sale_price": 25000, "stock": 25, "min_stock": 5},
        {"sku": "SP-INV-2KW-OG", "name": "2 kW Dual MPPT On-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 24000, "sale_price": 34000, "stock": 20, "min_stock": 5},
        {"sku": "SP-INV-3KW-OG", "name": "3 kW Smart Grid-Tie On-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 29000, "sale_price": 42000, "stock": 35, "min_stock": 8},
        {"sku": "SP-INV-5KW-OG", "name": "5 kW Three-Phase On-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 42000, "sale_price": 62000, "stock": 18, "min_stock": 4},
        {"sku": "SP-INV-3KW-HYB", "name": "3 kW Hybrid Off-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 38000, "sale_price": 54000, "stock": 12, "min_stock": 3},
        {"sku": "SP-INV-5KW-HYB", "name": "5 kW Hybrid Off-Grid 48V Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 55000, "sale_price": 78000, "stock": 8, "min_stock": 2},
        {"sku": "SP-INV-800W-MICRO", "name": "800W Dual-Input Microinverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 16000, "sale_price": 22000, "stock": 3, "min_stock": 5},

        # Batteries (2 yr warranty, serialised)
        {"sku": "SP-BAT-5KWH-LFP", "name": "5 kWh 48V Lithium-Ion (LiFePO4) Battery Bank", "category": ProductCategory.BATTERY, "is_serialised": True, "warranty_years": 2, "cost_price": 75000, "sale_price": 105000, "stock": 15, "min_stock": 4},
        {"sku": "SP-BAT-10KWH-LFP", "name": "10 kWh 48V High-Capacity Lithium Battery Bank", "category": ProductCategory.BATTERY, "is_serialised": True, "warranty_years": 2, "cost_price": 135000, "sale_price": 185000, "stock": 6, "min_stock": 2},
        {"sku": "SP-BAT-150AH-TUB", "name": "150Ah 12V Deep Cycle Tubular Battery", "category": ProductCategory.BATTERY, "is_serialised": True, "warranty_years": 2, "cost_price": 11500, "sale_price": 16000, "stock": 24, "min_stock": 6},
        {"sku": "SP-BAT-200AH-TUB", "name": "200Ah 12V Solar C10 Tubular Battery", "category": ProductCategory.BATTERY, "is_serialised": True, "warranty_years": 2, "cost_price": 14500, "sale_price": 19500, "stock": 16, "min_stock": 5},

        # Charge Controllers (2 yr warranty, serialised)
        {"sku": "SP-CC-60A-MPPT", "name": "60A 48V Ultra-Fast MPPT Charge Controller", "category": ProductCategory.CONTROLLER, "is_serialised": True, "warranty_years": 2, "cost_price": 9500, "sale_price": 14500, "stock": 20, "min_stock": 5},
        {"sku": "SP-CC-40A-MPPT", "name": "40A 24V MPPT Solar Charge Controller", "category": ProductCategory.CONTROLLER, "is_serialised": True, "warranty_years": 2, "cost_price": 6800, "sale_price": 10500, "stock": 14, "min_stock": 4},
        {"sku": "SP-CC-30A-PWM", "name": "30A 12V/24V PWM Charge Controller", "category": ProductCategory.CONTROLLER, "is_serialised": True, "warranty_years": 2, "cost_price": 1800, "sale_price": 3200, "stock": 25, "min_stock": 5},

        # Balance of System & Accessories
        {"sku": "SP-BOS-DCDB-1P", "name": "DC Distribution Box (DCDB) 1-In 1-Out IP65", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 1, "cost_price": 2800, "sale_price": 4500, "stock": 45, "min_stock": 10},
        {"sku": "SP-BOS-ACDB-1P", "name": "AC Distribution Box (ACDB) Single Phase IP65", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 1, "cost_price": 3200, "sale_price": 5000, "stock": 40, "min_stock": 10},
        {"sku": "SP-BOS-EARTH-KIT", "name": "Chemical Earthing Kit (Copper Rod + BFC Compound)", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 1, "cost_price": 2500, "sale_price": 4200, "stock": 55, "min_stock": 15},
        {"sku": "SP-BOS-STR-GI-3KW", "name": "Elevated Hot-Dip GI Rooftop Mounting Structure 3kW", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 5, "cost_price": 12000, "sale_price": 18000, "stock": 22, "min_stock": 5},
        {"sku": "SP-BOS-STR-AL-3KW", "name": "Anodized Aluminium Rail Mounting Structure 3kW", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 5, "cost_price": 14500, "sale_price": 21000, "stock": 18, "min_stock": 4},
        {"sku": "SP-CAB-DC-4MM", "name": "Solar DC Cable 4 sq mm Red/Black (100m Roll)", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 2, "cost_price": 4800, "sale_price": 7200, "stock": 35, "min_stock": 8},
        {"sku": "SP-CAB-AC-6MM", "name": "AC Armoured Cable 6 sq mm (50m Roll)", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 2, "cost_price": 3600, "sale_price": 5400, "stock": 28, "min_stock": 6},
        {"sku": "SP-CON-MC4", "name": "MC4 Solar Connectors Male/Female IP68 (Set of 10)", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 1, "cost_price": 600, "sale_price": 1200, "stock": 120, "min_stock": 25},
        {"sku": "SP-BOS-LA-COPPER", "name": "Class-B Pure Copper Lightning Arrester with Base", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 2, "cost_price": 2200, "sale_price": 3800, "stock": 30, "min_stock": 5},
        {"sku": "SP-MTR-NET-3P", "name": "Bi-Directional Net Meter (DISCOM Compliant 3-Phase)", "category": ProductCategory.BOS, "is_serialised": True, "warranty_years": 2, "cost_price": 8500, "sale_price": 12500, "stock": 14, "min_stock": 3},

        # Services
        {"sku": "SP-SRV-INST-1KW", "name": "Standard Rooftop Installation & Commissioning 1kW", "category": ProductCategory.SERVICE, "is_serialised": False, "warranty_years": 1, "cost_price": 4000, "sale_price": 8000, "stock": 999, "min_stock": 0},
        {"sku": "SP-SRV-INST-3KW", "name": "Standard Rooftop Installation & Commissioning 3kW", "category": ProductCategory.SERVICE, "is_serialised": False, "warranty_years": 1, "cost_price": 8000, "sale_price": 15000, "stock": 999, "min_stock": 0},
        {"sku": "SP-SRV-INST-5KW", "name": "Commercial Rooftop Installation & Commissioning 5kW", "category": ProductCategory.SERVICE, "is_serialised": False, "warranty_years": 1, "cost_price": 12000, "sale_price": 24000, "stock": 999, "min_stock": 0},
    ]

    prod_map = {}
    for p in products_catalog:
        prod = db.query(Product).filter(Product.sku == p["sku"]).first()
        if not prod:
            prod = Product(
                sku=p["sku"],
                name=p["name"],
                category=p["category"],
                is_serialised=p["is_serialised"],
                warranty_years=p["warranty_years"],
                cost_price=p["cost_price"],
                sale_price=p["sale_price"],
                stock_quantity=p["stock"],
                min_stock_alert=p["min_stock"],
            )
            db.add(prod)
            db.flush()
        prod_map[p["sku"]] = prod

    # 3. SEED BOM TEMPLATES
    print("--- Seeding On-Grid & Off-Grid BOM Templates ---")
    bom_templates_def = [
        {
            "name": "1 kW On-Grid System",
            "capacity_kw": 1.0,
            "system_type": "On-Grid",
            "description": "Compact rooftop system for 1-2 BHK apartments.",
            "lines": [
                ("SP-PNL-540W", 2),
                ("SP-INV-1KW-OG", 1),
                ("SP-BOS-DCDB-1P", 1),
                ("SP-BOS-ACDB-1P", 1),
                ("SP-BOS-EARTH-KIT", 1),
                ("SP-CON-MC4", 1),
                ("SP-CAB-DC-4MM", 1),
                ("SP-SRV-INST-1KW", 1),
            ]
        },
        {
            "name": "3 kW On-Grid System",
            "capacity_kw": 3.0,
            "system_type": "On-Grid",
            "description": "Our most popular home system. Zero monthly electric bills.",
            "lines": [
                ("SP-PNL-540W", 6),
                ("SP-INV-3KW-OG", 1),
                ("SP-BOS-DCDB-1P", 1),
                ("SP-BOS-ACDB-1P", 1),
                ("SP-BOS-EARTH-KIT", 1),
                ("SP-BOS-STR-GI-3KW", 1),
                ("SP-CAB-DC-4MM", 1),
                ("SP-CAB-AC-6MM", 1),
                ("SP-CON-MC4", 2),
                ("SP-SRV-INST-3KW", 1),
            ]
        },
        {
            "name": "5 kW On-Grid System",
            "capacity_kw": 5.0,
            "system_type": "On-Grid",
            "description": "High-output three-phase residential & commercial solar system.",
            "lines": [
                ("SP-PNL-540W", 10),
                ("SP-INV-5KW-OG", 1),
                ("SP-BOS-DCDB-1P", 1),
                ("SP-BOS-ACDB-1P", 1),
                ("SP-BOS-EARTH-KIT", 2),
                ("SP-BOS-STR-GI-3KW", 2),
                ("SP-CAB-DC-4MM", 2),
                ("SP-CAB-AC-6MM", 2),
                ("SP-CON-MC4", 3),
                ("SP-SRV-INST-5KW", 1),
            ]
        },
        {
            "name": "3 kW Off-Grid System",
            "capacity_kw": 3.0,
            "system_type": "Off-Grid",
            "description": "Hybrid solar system with 5kWh Lithium battery backup.",
            "lines": [
                ("SP-PNL-540W", 6),
                ("SP-INV-3KW-HYB", 1),
                ("SP-BAT-5KWH-LFP", 1),
                ("SP-CC-60A-MPPT", 1),
                ("SP-BOS-DCDB-1P", 1),
                ("SP-BOS-ACDB-1P", 1),
                ("SP-BOS-EARTH-KIT", 1),
                ("SP-BOS-STR-GI-3KW", 1),
                ("SP-CAB-DC-4MM", 1),
                ("SP-CON-MC4", 2),
                ("SP-SRV-INST-3KW", 1),
            ]
        },
    ]

    bom_map = {}
    for b_def in bom_templates_def:
        bom = db.query(BOMTemplate).filter(BOMTemplate.name == b_def["name"]).first()
        if not bom:
            bom = BOMTemplate(
                name=b_def["name"],
                capacity_kw=b_def["capacity_kw"],
                system_type=b_def["system_type"],
                description=b_def["description"],
            )
            db.add(bom)
            db.flush()
            for sku, qty in b_def["lines"]:
                p = prod_map.get(sku)
                if p:
                    line = BOMLine(
                        template_id=bom.id,
                        product_id=p.id,
                        quantity=qty,
                    )
                    db.add(line)
            db.flush()
        bom_map[b_def["name"]] = bom

    # 4. SEED CUSTOMERS & COMPLETE LIFECYCLE SCENARIOS
    print("--- Seeding 10 Real-world Customer Scenarios Across Lifecycle ---")
    today = date.today()

    scenarios = [
        # Customer 1: NEW Unassigned lead
        {
            "cust_name": "Siddharth Malhotra",
            "phone": "+91 98330 11001",
            "email": "sid.malhotra@gmail.com",
            "address": "B-402, Green Acres, Powai, Mumbai",
            "stage": "LEAD_NEW",
            "kw": 2.0,
            "system_type": "On-Grid"
        },
        # Customer 2: CONTACTED Lead
        {
            "cust_name": "Meenakshi Sundaram",
            "phone": "+91 98440 22002",
            "email": "meenakshi.s@outlook.com",
            "address": "14/A, Anna Nagar West, Chennai",
            "stage": "LEAD_CONTACTED",
            "kw": 3.0,
            "system_type": "On-Grid"
        },
        # Customer 3: QUALIFIED Lead with checklist
        {
            "cust_name": "Harish Chandra",
            "phone": "+91 98550 33003",
            "email": "harish.chandra@rediffmail.com",
            "address": "88, Civil Lines, Jaipur",
            "stage": "LEAD_QUALIFIED",
            "kw": 5.0,
            "system_type": "On-Grid"
        },
        # Customer 4: SURVEY SCHEDULED
        {
            "cust_name": "Alok Sengupta",
            "phone": "+91 98660 44004",
            "email": "alok.sengupta@tcs.com",
            "address": "Salt Lake Sector V, Kolkata",
            "stage": "SURVEY_SCHEDULED",
            "kw": 3.0,
            "system_type": "On-Grid"
        },
        # Customer 5: SURVEY APPROVED (Ready to quote)
        {
            "cust_name": "Gurpreet Singh Dhillon",
            "phone": "+91 98770 55005",
            "email": "gs.dhillon@yahoo.com",
            "address": "45 Model Town, Ludhiana",
            "stage": "SURVEY_APPROVED",
            "kw": 5.0,
            "system_type": "On-Grid"
        },
        # Customer 6: QUOTED (Customer reviewing proposal PDF)
        {
            "cust_name": "Venkatesh Iyer",
            "phone": "+91 98880 66006",
            "email": "venky.iyer@infosys.com",
            "address": "Indiranagar 100ft Road, Bengaluru",
            "stage": "QUOTED",
            "kw": 3.0,
            "system_type": "On-Grid"
        },
        # Customer 7: CONFIRMED ORDER & Advance payment
        {
            "cust_name": "Arun Kothari",
            "phone": "+91 98990 77007",
            "email": "arun.kothari@kotharigroup.in",
            "address": "Kothari Mansion, MG Road, Pune",
            "stage": "CONFIRMED",
            "kw": 3.0,
            "system_type": "On-Grid"
        },
        # Customer 8: DELIVERED with Barcodes scanned & auto-warranty active
        {
            "cust_name": "Dr. Sunita Bansal",
            "phone": "+91 98101 88008",
            "email": "dr.sunita@medicare.org",
            "address": "Clinic Complex, Ring Road, New Delhi",
            "stage": "DELIVERED",
            "kw": 3.0,
            "system_type": "Off-Grid"
        },
        # Customer 9: INSTALLED (Commissioned with power generation test, photo, timesheet, customer sign-off)
        {
            "cust_name": "Mukesh Ambani Estates",
            "phone": "+91 98202 99009",
            "email": "facilities@ambaniestates.com",
            "address": "Plot 12, Cyber City, Gurugram",
            "stage": "INSTALLED",
            "kw": 5.0,
            "system_type": "On-Grid"
        },
        # Customer 10: INVOICED & SUBSIDY APPROVED with Tickets (Demo Customer)
        {
            "cust_name": "Vikram Malhotra",
            "phone": "+91 98110 00007",
            "email": "customer@sunpower.com",
            "address": "Boring Road, Patna",
            "stage": "CLOSED",
            "kw": 3.0,
            "system_type": "On-Grid"
        },
    ]

    for idx, sc in enumerate(scenarios, start=1):
        # Create or find customer
        cust = db.query(Customer).filter((Customer.phone == sc["phone"]) | (Customer.email == sc["email"])).first()
        if not cust:
            user_link_id = customer_user.id if sc["email"] == "customer@sunpower.com" else None
            cust = Customer(
                user_id=user_link_id,
                name=sc["cust_name"],
                phone=sc["phone"],
                email=sc["email"],
                address=sc["address"],
            )
            db.add(cust)
            db.flush()
        else:
            if sc["email"] == "customer@sunpower.com":
                cust.user_id = customer_user.id
                db.flush()

        # Create Lead
        lead = db.query(Lead).filter(Lead.customer_id == cust.id).first()
        if not lead:
            lead = Lead(
                name=sc["cust_name"],
                phone=sc["phone"],
                email=sc["email"],
                address=sc["address"],
                required_capacity=sc["kw"],
                system_type=sc["system_type"],
                customer_id=cust.id,
                status=LeadStatus.NEW,
                assigned_to_id=sales_user.id,
                notes=f"Interested in {sc['kw']} kW rooftop solar installation."
            )
            db.add(lead)
            db.flush()

        if sc["stage"] in ["LEAD_CONTACTED", "LEAD_QUALIFIED", "SURVEY_SCHEDULED", "SURVEY_APPROVED", "QUOTED", "CONFIRMED", "DELIVERED", "INSTALLED", "CLOSED"]:
            lead.status = LeadStatus.CONTACTED

        if sc["stage"] in ["LEAD_QUALIFIED", "SURVEY_SCHEDULED", "SURVEY_APPROVED", "QUOTED", "CONFIRMED", "DELIVERED", "INSTALLED", "CLOSED"]:
            lead.status = LeadStatus.QUALIFIED
            chk = db.query(CallChecklist).filter(CallChecklist.lead_id == lead.id).first()
            if not chk:
                chk = CallChecklist(
                    lead_id=lead.id,
                    shadow_free_area_sqft=sc["kw"] * 100 + 50,
                    monthly_bill_amount=sc["kw"] * 1500,
                    is_grid_suitable=True,
                    remarks="Clear southern exposure, RCC terrace roof."
                )
                db.add(chk)

        if sc["stage"] in ["SURVEY_SCHEDULED", "SURVEY_APPROVED", "QUOTED", "CONFIRMED", "DELIVERED", "INSTALLED", "CLOSED"]:
            lead.status = LeadStatus.SURVEY_SCHEDULED
            survey = db.query(Survey).filter(Survey.lead_id == lead.id).first()
            if not survey:
                survey = Survey(
                    lead_id=lead.id,
                    technician_id=lead_tech.id,
                    scheduled_date=datetime.now() - timedelta(days=5),
                    status=SurveyStatus.SCHEDULED
                )
                db.add(survey)
                db.flush()

        if sc["stage"] in ["SURVEY_APPROVED", "QUOTED", "CONFIRMED", "DELIVERED", "INSTALLED", "CLOSED"]:
            survey = db.query(Survey).filter(Survey.lead_id == lead.id).first()
            if survey:
                survey.status = SurveyStatus.APPROVED
                survey.roof_direction = "South"
                survey.roof_tilt_deg = 22.5
                survey.cable_distance_meters = 15.0
                survey.notes = "Terrace in prime condition, easy conduit path to meter box."
                survey.approved_by_id = admin_user.id
                survey.approved_at = datetime.now() - timedelta(days=4)
                lead.status = LeadStatus.SURVEY_APPROVED

        if sc["stage"] in ["QUOTED", "CONFIRMED", "DELIVERED", "INSTALLED", "CLOSED"]:
            quote_num = f"QT-2026-{idx:04d}"
            quote = db.query(Quote).filter((Quote.lead_id == lead.id) | (Quote.quote_number == quote_num)).first()
            if not quote:
                bom_name = "3 kW On-Grid System" if sc["kw"] == 3.0 and sc["system_type"] == "On-Grid" else "5 kW On-Grid System" if sc["kw"] == 5.0 else "3 kW Off-Grid System"
                template = bom_map.get(bom_name, bom_map["3 kW On-Grid System"])
                
                # Calculate subtotal
                tot = sum(line.quantity * line.product.sale_price for line in template.lines)
                quote = Quote(
                    quote_number=quote_num,
                    lead_id=lead.id,
                    customer_id=cust.id,
                    template_id=template.id,
                    subtotal=tot,
                    subsidy_amount=sc["kw"] * 18000,
                    tax_amount=tot * 0.12,
                    total_amount=tot + (tot * 0.12) - (sc["kw"] * 18000),
                    status=QuoteStatus.ACCEPTED if sc["stage"] != "QUOTED" else QuoteStatus.SENT,
                )
                db.add(quote)
                db.flush()
                for line in template.lines:
                    q_line = QuoteLine(
                        quote_id=quote.id,
                        product_id=line.product_id,
                        quantity=line.quantity,
                        unit_price=line.product.sale_price,
                        subtotal=line.quantity * line.product.sale_price
                    )
                    db.add(q_line)
                lead.status = LeadStatus.QUOTED

        if sc["stage"] in ["CONFIRMED", "DELIVERED", "INSTALLED", "CLOSED"]:
            order_num = f"SO-2026-{idx:04d}"
            order = db.query(Order).filter((Order.customer_id == cust.id) | (Order.order_number == order_num)).first()
            if not order:
                quote = db.query(Quote).filter(Quote.customer_id == cust.id).first()
                order = Order(
                    order_number=order_num,
                    quote_id=quote.id if quote else 1,
                    customer_id=cust.id,
                    total_amount=quote.total_amount if quote else 150000,
                    paid_amount=0,
                    status=OrderStatus.CONFIRMED if sc["stage"] == "CONFIRMED" else OrderStatus.DELIVERED if sc["stage"] == "DELIVERED" else OrderStatus.INSTALLED if sc["stage"] == "INSTALLED" else OrderStatus.CLOSED,
                    confirmed_at=datetime.now() - timedelta(days=3)
                )
                db.add(order)
                db.flush()
                # Advance payment
                payment = Payment(
                    order_id=order.id,
                    amount=order.total_amount * 0.5,
                    method=PaymentMethod.UPI,
                    transaction_ref=f"UPI-REF-{idx:06d}",
                    recorded_by_id=accounts_user.id
                )
                db.add(payment)
                order.paid_amount = payment.amount

                # Generate PickList
                picklist = db.query(PickList).filter(PickList.order_id == order.id).first()
                if not picklist:
                    picklist = PickList(
                        order_id=order.id,
                        status="PACKED" if sc["stage"] != "CONFIRMED" else "PENDING",
                        packed_at=datetime.now() - timedelta(days=2) if sc["stage"] != "CONFIRMED" else None
                    )
                    db.add(picklist)
                    db.flush()

                # Generate Installation Job
                job = db.query(InstallationJob).filter(InstallationJob.order_id == order.id).first()
                if not job:
                    job = InstallationJob(
                        order_id=order.id,
                        technician_id=lead_tech.id,
                        scheduled_date=datetime.now() - timedelta(days=2),
                        status=JobStatus.COMPLETED if sc["stage"] in ["INSTALLED", "CLOSED"] else JobStatus.SCHEDULED
                    )
                    db.add(job)
                    db.flush()

        if sc["stage"] in ["DELIVERED", "INSTALLED", "CLOSED"]:
            order = db.query(Order).filter((Order.customer_id == cust.id) | (Order.order_number == f"SO-2026-{idx:04d}")).first()
            inv_prod = prod_map["SP-INV-3KW-OG"] if sc["kw"] == 3.0 and sc["system_type"] == "On-Grid" else prod_map["SP-INV-3KW-HYB"] if sc["system_type"] == "Off-Grid" else prod_map["SP-INV-5KW-OG"]
            ser_inv_no = f"INV-SN-{idx:04d}-992"
            ser_inv = db.query(SerialItem).filter(SerialItem.serial_no == ser_inv_no).first()
            if not ser_inv and order:
                ser_inv = SerialItem(
                    serial_no=ser_inv_no,
                    product_id=inv_prod.id,
                    order_id=order.id,
                    customer_id=cust.id,
                    status=SerialStatus.DELIVERED,
                    delivered_on=today - timedelta(days=10),
                    warranty_end=today - timedelta(days=10) + timedelta(days=inv_prod.warranty_years * 365)
                )
                db.add(ser_inv)

            if sc["system_type"] == "Off-Grid":
                bat_prod = prod_map["SP-BAT-5KWH-LFP"]
                ser_bat_no = f"BAT-SN-{idx:04d}-441"
                ser_bat = db.query(SerialItem).filter(SerialItem.serial_no == ser_bat_no).first()
                if not ser_bat and order:
                    ser_bat = SerialItem(
                        serial_no=ser_bat_no,
                        product_id=bat_prod.id,
                        order_id=order.id,
                        customer_id=cust.id,
                        status=SerialStatus.DELIVERED,
                        delivered_on=today - timedelta(days=10),
                        warranty_end=today - timedelta(days=10) + timedelta(days=bat_prod.warranty_years * 365)
                    )
                    db.add(ser_bat)

        if sc["stage"] in ["INSTALLED", "CLOSED"]:
            order = db.query(Order).filter((Order.customer_id == cust.id) | (Order.order_number == f"SO-2026-{idx:04d}")).first()
            job = db.query(InstallationJob).filter(InstallationJob.order_id == order.id).first() if order else None
            if job and job.status != JobStatus.COMPLETED:
                job.started_at = datetime.now() - timedelta(days=1, hours=6)
                job.finished_at = datetime.now() - timedelta(days=1)
                job.confirmed_capacity_kw = sc["kw"]
                job.power_generating = True
                job.status = JobStatus.COMPLETED

                # Signature
                sig = db.query(JobSignature).filter(JobSignature.job_id == job.id).first()
                if not sig:
                    sig = JobSignature(
                        job_id=job.id,
                        customer_name=cust.name,
                        signature_data="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                        signed_at=datetime.now() - timedelta(days=1)
                    )
                    db.add(sig)

                # Timesheet & Payout
                ts = db.query(Timesheet).filter(Timesheet.job_id == job.id).first()
                if not ts:
                    ts = Timesheet(
                        job_id=job.id,
                        technician_id=lead_tech.id,
                        start_time=job.started_at,
                        finish_time=job.finished_at,
                        hours=5.0,
                        hourly_rate=600.0,
                        total_cost=3000.0
                    )
                    db.add(ts)
                payout = db.query(TechnicianPayout).filter(TechnicianPayout.job_id == job.id).first()
                if not payout:
                    payout = TechnicianPayout(
                        job_id=job.id,
                        technician_id=lead_tech.id,
                        hours=5.0,
                        hourly_rate=600.0,
                        total_amount=3000.0,
                        is_paid=True if sc["stage"] == "CLOSED" else False,
                        paid_at=datetime.now() - timedelta(days=1) if sc["stage"] == "CLOSED" else None
                    )
                    db.add(payout)

        if sc["stage"] == "CLOSED":
            order = db.query(Order).filter((Order.customer_id == cust.id) | (Order.order_number == f"SO-2026-{idx:04d}")).first()
            if order:
                order.paid_amount = order.total_amount
                order.status = OrderStatus.CLOSED

                # Invoice
                inv_no = f"INV-2026-{idx:04d}"
                inv = db.query(Invoice).filter(Invoice.invoice_number == inv_no).first()
                if not inv:
                    inv = Invoice(
                        invoice_number=inv_no,
                        order_id=order.id,
                        customer_id=cust.id,
                        invoice_type=InvoiceType.SALES,
                        subtotal=order.total_amount * 0.9,
                        tax_amount=order.total_amount * 0.1,
                        total_amount=order.total_amount,
                        status=InvoiceStatus.PAID
                    )
                    db.add(inv)

                # Subsidy record
                sub = db.query(SubsidyRecord).filter(SubsidyRecord.order_id == order.id).first()
                if not sub:
                    sub = SubsidyRecord(
                        order_id=order.id,
                        application_no=f"MNRE-SOLAR-2026-{idx:05d}",
                        portal_name="National Solar Portal",
                        status=SubsidyStatus.APPROVED,
                        eligible_amount=sc["kw"] * 18000,
                        disbursed_amount=0.0,
                        approved_date=today - timedelta(days=2)
                    )
                    db.add(sub)

            # Helpdesk Tickets (1 In-warranty free, 1 Out-of-warranty billable)
            t1 = db.query(Ticket).filter(Ticket.ticket_number == "TCK-2026-0001").first()
            if not t1:
                t1 = Ticket(
                    ticket_number="TCK-2026-0001",
                    subject="Panel Dust Cleaning & Inspection",
                    description="Quarterly checkup requested under free annual maintenance contract.",
                    customer_id=cust.id,
                    status=TicketStatus.RESOLVED,
                    is_billable=False,
                    resolution_notes="Panels washed with deionized water; string output back to 100%.",
                    repair_cost=0.0
                )
                db.add(t1)

            t2 = db.query(Ticket).filter(Ticket.ticket_number == "TCK-2026-0002").first()
            if not t2:
                t2 = Ticket(
                    ticket_number="TCK-2026-0002",
                    subject="Out-of-Warranty MCB & Cable Repair",
                    description="External lightning surge tripped MCB and melted terminal lug.",
                    customer_id=cust.id,
                    status=TicketStatus.CLOSED,
                    is_billable=True,
                    resolution_notes="Replaced surge protection device and rewound DC cable.",
                    repair_cost=5000.0,
                    customer_confirmed_at=datetime.now() - timedelta(hours=5),
                    closed_at=datetime.now() - timedelta(hours=2)
                )
                db.add(t2)

    db.commit()
    db.close()
    print("✓ Full SunPower Solutions demo dataset successfully seeded!")


if __name__ == "__main__":
    run_seed()
