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
from app.models.scheme import GovernmentScheme


def run_seed():
    print("Initializing RoofRay Solutions reference data seeder...")
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        alter_cols = [
            "ALTER TABLE customers ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE leads ADD COLUMN city VARCHAR(100)",
            "ALTER TABLE leads ADD COLUMN state VARCHAR(100)",
            "ALTER TABLE leads ADD COLUMN pincode VARCHAR(20)",
            "ALTER TABLE leads ADD COLUMN property_type VARCHAR(64)",
            "ALTER TABLE leads ADD COLUMN roof_type VARCHAR(64)",
            "ALTER TABLE leads ADD COLUMN roof_area_sqft FLOAT",
            "ALTER TABLE leads ADD COLUMN shadow_free_area_sqft FLOAT",
            "ALTER TABLE leads ADD COLUMN floor_number INTEGER DEFAULT 1",
            "ALTER TABLE leads ADD COLUMN roof_direction VARCHAR(64)",
            "ALTER TABLE leads ADD COLUMN monthly_bill_amount FLOAT",
            "ALTER TABLE leads ADD COLUMN source VARCHAR(64) DEFAULT 'customer_portal'",
            "ALTER TABLE subsidy_records ADD COLUMN sanctioned_amount FLOAT DEFAULT 0.0",
            "ALTER TABLE subsidy_records ADD COLUMN rejection_notes TEXT",
        ]
        for stmt in alter_cols:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass
    db = SessionLocal()

    # 1. SEED ONE LOGIN PER ROLE
    print("--- Seeding Staff & Technicians ---")
    core_users = [
        {"email": "admin@roofray.com", "full_name": "Rajesh Singhania (Director & Admin)", "role": UserRole.ADMIN, "uid": "admin_uid", "phone": "+91 98110 00001"},
        {"email": "sales@roofray.com", "full_name": "Rohan Sharma (Sr. Sales)", "role": UserRole.SALES, "uid": "sales_uid", "phone": "+91 98110 00002"},
        {"email": "warehouse@roofray.com", "full_name": "Deepak Kumar (Warehouse Lead)", "role": UserRole.WAREHOUSE, "uid": "warehouse_uid", "phone": "+91 98110 00004"},
        {"email": "customer@roofray.com", "full_name": "Vikram Malhotra (Customer)", "role": UserRole.CUSTOMER, "uid": "customer_uid", "phone": "+91 98110 00007"},
    ]

    # One login per role; real staff are added from the Users admin page
    tech_names = ["Field Technician"]

    all_users = list(core_users)
    for idx, name in enumerate(tech_names, start=1):
        uid = "tech_uid" if idx == 1 else f"tech_{idx}_uid"
        all_users.append({
            "email": f"tech{idx}@roofray.com" if idx > 1 else "tech@roofray.com",
            "full_name": f"{name} (Tech #{idx})",
            "role": UserRole.TECHNICIAN,
            "uid": uid,
            "phone": f"+91 98220 {idx:05d}",
        })

    user_map = {}
    for u in all_users:
        old_email = u["email"].replace("@roofray.com", "@sunpower.com")
        existing = db.query(User).filter(
            (User.email == u["email"]) | (User.email == old_email) | (User.firebase_uid == u["uid"])
        ).first()
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
            existing.email = u["email"]
            # Migrate any deprecated roles to ADMIN
            if existing.role not in [UserRole.CUSTOMER, UserRole.SALES, UserRole.TECHNICIAN, UserRole.WAREHOUSE, UserRole.ADMIN]:
                existing.role = UserRole.ADMIN
                db.flush()
            user_map[u["role"]] = user_map.get(u["role"], []) + [existing]


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

    print("--- Seeding Government Solar Schemes ---")
    pm_scheme = db.query(GovernmentScheme).filter(GovernmentScheme.name.like("%PM Surya Ghar%")).first()
    if not pm_scheme:
        pm_scheme = GovernmentScheme(
            name="PM Surya Ghar: Muft Bijli Yojana",
            description="Flagship national rooftop solar initiative by the Ministry of New and Renewable Energy (MNRE), Government of India, enabling households to generate up to 300 free units of electricity every month with direct bank transfer subsidies.",
            eligibility="Residential households, registered Indian citizen, valid electricity connection and consumer number with local DISCOM, suitable shadow-free rooftop, grid-tied solar system with net-metering. Note: Off-Grid systems are NOT eligible for central subsidies.",
            benefit_amounts="• 1 kW System: ₹30,000 fixed central financial assistance (CFA)\n• 2 kW System: ₹60,000 CFA (₹30,000/kW)\n• 3 kW & Above: ₹78,000 maximum fixed CFA\n• Off-Grid Systems: ₹0 (No central subsidy)",
            how_to_apply="1. Register on the official National Portal (https://pmsuryaghar.gov.in) with your DISCOM consumer number.\n2. Submit online rooftop solar application and obtain Technical Feasibility Approval.\n3. Execute agreement with an empaneled installer (RoofRay Solutions).\n4. Post-installation, submit work completion report and net-metering request.\n5. DISCOM inspection and commissioning certificate generation.\n6. Direct Benefit Transfer (DBT) credited straight to customer bank account within 30 days.",
            official_link="https://pmsuryaghar.gov.in",
            state="National / All India",
            is_active=True,
            is_announcement=True,
            announcement_text="Special subsidy window active: Get up to ₹78,000 direct bank transfer for residential on-grid systems!"
        )
        db.add(pm_scheme)

    state_scheme = db.query(GovernmentScheme).filter(GovernmentScheme.name.like("%Delhi Solar%")).first()
    if not state_scheme:
        state_scheme = GovernmentScheme(
            name="Delhi Solar Energy Policy (State Incentive)",
            description="Additional state generation-based incentive (GBI) of ₹3.00/kWh for residential consumers on top of central PM Surya Ghar subsidy.",
            eligibility="Residential consumers under BSES Rajdhani, BSES Yamuna, or TPDDL within NCT of Delhi.",
            benefit_amounts="Generation-based incentive of ₹3.00 per unit generated for 5 years, credited monthly directly against power bills.",
            how_to_apply="Applied automatically upon net-meter installation and DISCOM GBI registration through RoofRay Solutions.",
            official_link="https://delhi.gov.in",
            state="Delhi NCT",
            is_active=True,
            is_announcement=False
        )
        db.add(state_scheme)

    db.commit()
    db.close()
    print("✓ Reference data (staff logins, catalog, BOM templates, schemes) seeded. No demo transactions created.")


if __name__ == "__main__":
    run_seed()
