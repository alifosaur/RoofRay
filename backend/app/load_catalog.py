"""
CONFIGURATION DATA (not demo data): product catalogue, BOM templates and government scheme content.

Run explicitly, never automatically:  python -m app.load_catalog
Insert-only: rows that already exist (matched by SKU / template name / scheme name) are left untouched,
so admin edits made afterwards are never overwritten. Contains no customers, orders, stock or transactions.
Opening stock is recorded through Inventory > Purchases.
"""
import math

from app.core.database import SessionLocal, engine, Base
import app.models  # noqa: F401  (register models)
from app.models.product import Product, ProductCategory
from app.models.bom import BOMTemplate, BOMLine
from app.models.scheme import GovernmentScheme

PRODUCTS = [
    # Panels (20 yr warranty, serialised high-wattage panels)
    {"sku": "SP-PNL-540W", "name": "540W Mono PERC Half-Cut Solar Panel", "category": ProductCategory.PANEL, "is_serialised": True, "warranty_years": 20, "cost_price": 10500, "sale_price": 14000, "min_stock": 30},
    {"sku": "SP-PNL-450W", "name": "450W Mono PERC Solar Panel", "category": ProductCategory.PANEL, "is_serialised": False, "warranty_years": 20, "cost_price": 8800, "sale_price": 12000, "min_stock": 20},
    {"sku": "SP-PNL-550W-BF", "name": "550W Bi-Facial Dual Glass Solar Panel", "category": ProductCategory.PANEL, "is_serialised": False, "warranty_years": 20, "cost_price": 12500, "sale_price": 16500, "min_stock": 15},
    {"sku": "SP-PNL-580W-TC", "name": "580W N-Type TopCon High Output Panel", "category": ProductCategory.PANEL, "is_serialised": False, "warranty_years": 20, "cost_price": 14000, "sale_price": 18500, "min_stock": 10},
    {"sku": "SP-PNL-330W-POLY", "name": "330W Polycrystalline Solar Panel", "category": ProductCategory.PANEL, "is_serialised": False, "warranty_years": 20, "cost_price": 6200, "sale_price": 8500, "min_stock": 10},

    # Inverters (2 yr warranty, serialised)
    {"sku": "SP-INV-1KW-OG", "name": "1 kW Smart Grid-Tie On-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 18000, "sale_price": 25000, "min_stock": 5},
    {"sku": "SP-INV-2KW-OG", "name": "2 kW Dual MPPT On-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 24000, "sale_price": 34000, "min_stock": 5},
    {"sku": "SP-INV-3KW-OG", "name": "3 kW Smart Grid-Tie On-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 29000, "sale_price": 42000, "min_stock": 8},
    {"sku": "SP-INV-5KW-OG", "name": "5 kW Three-Phase On-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 42000, "sale_price": 62000, "min_stock": 4},
    {"sku": "SP-INV-3KW-HYB", "name": "3 kW Hybrid Off-Grid Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 38000, "sale_price": 54000, "min_stock": 3},
    {"sku": "SP-INV-5KW-HYB", "name": "5 kW Hybrid Off-Grid 48V Inverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 55000, "sale_price": 78000, "min_stock": 2},
    {"sku": "SP-INV-800W-MICRO", "name": "800W Dual-Input Microinverter", "category": ProductCategory.INVERTER, "is_serialised": True, "warranty_years": 2, "cost_price": 16000, "sale_price": 22000, "min_stock": 5},

    # Batteries (2 yr warranty, serialised)
    {"sku": "SP-BAT-5KWH-LFP", "name": "5 kWh 48V Lithium-Ion (LiFePO4) Battery Bank", "category": ProductCategory.BATTERY, "is_serialised": True, "warranty_years": 2, "cost_price": 75000, "sale_price": 105000, "min_stock": 4},
    {"sku": "SP-BAT-10KWH-LFP", "name": "10 kWh 48V High-Capacity Lithium Battery Bank", "category": ProductCategory.BATTERY, "is_serialised": True, "warranty_years": 2, "cost_price": 135000, "sale_price": 185000, "min_stock": 2},
    {"sku": "SP-BAT-150AH-TUB", "name": "150Ah 12V Deep Cycle Tubular Battery", "category": ProductCategory.BATTERY, "is_serialised": True, "warranty_years": 2, "cost_price": 11500, "sale_price": 16000, "min_stock": 6},
    {"sku": "SP-BAT-200AH-TUB", "name": "200Ah 12V Solar C10 Tubular Battery", "category": ProductCategory.BATTERY, "is_serialised": True, "warranty_years": 2, "cost_price": 14500, "sale_price": 19500, "min_stock": 5},

    # Charge Controllers (2 yr warranty, serialised)
    {"sku": "SP-CC-60A-MPPT", "name": "60A 48V Ultra-Fast MPPT Charge Controller", "category": ProductCategory.CONTROLLER, "is_serialised": True, "warranty_years": 2, "cost_price": 9500, "sale_price": 14500, "min_stock": 5},
    {"sku": "SP-CC-40A-MPPT", "name": "40A 24V MPPT Solar Charge Controller", "category": ProductCategory.CONTROLLER, "is_serialised": True, "warranty_years": 2, "cost_price": 6800, "sale_price": 10500, "min_stock": 4},
    {"sku": "SP-CC-30A-PWM", "name": "30A 12V/24V PWM Charge Controller", "category": ProductCategory.CONTROLLER, "is_serialised": True, "warranty_years": 2, "cost_price": 1800, "sale_price": 3200, "min_stock": 5},

    # Balance of System & Accessories
    {"sku": "SP-BOS-DCDB-1P", "name": "DC Distribution Box (DCDB) 1-In 1-Out IP65", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 1, "cost_price": 2800, "sale_price": 4500, "min_stock": 10},
    {"sku": "SP-BOS-ACDB-1P", "name": "AC Distribution Box (ACDB) Single Phase IP65", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 1, "cost_price": 3200, "sale_price": 5000, "min_stock": 10},
    {"sku": "SP-BOS-EARTH-KIT", "name": "Chemical Earthing Kit (Copper Rod + BFC Compound)", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 1, "cost_price": 2500, "sale_price": 4200, "min_stock": 15},
    {"sku": "SP-BOS-STR-GI-3KW", "name": "Elevated Hot-Dip GI Rooftop Mounting Structure 3kW", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 5, "cost_price": 12000, "sale_price": 18000, "min_stock": 5},
    {"sku": "SP-BOS-STR-AL-3KW", "name": "Anodized Aluminium Rail Mounting Structure 3kW", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 5, "cost_price": 14500, "sale_price": 21000, "min_stock": 4},
    {"sku": "SP-CAB-DC-4MM", "name": "Solar DC Cable 4 sq mm Red/Black (100m Roll)", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 2, "cost_price": 4800, "sale_price": 7200, "min_stock": 8},
    {"sku": "SP-CAB-AC-6MM", "name": "AC Armoured Cable 6 sq mm (50m Roll)", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 2, "cost_price": 3600, "sale_price": 5400, "min_stock": 6},
    {"sku": "SP-CON-MC4", "name": "MC4 Solar Connectors Male/Female IP68 (Set of 10)", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 1, "cost_price": 600, "sale_price": 1200, "min_stock": 25},
    {"sku": "SP-BOS-LA-COPPER", "name": "Class-B Pure Copper Lightning Arrester with Base", "category": ProductCategory.BOS, "is_serialised": False, "warranty_years": 2, "cost_price": 2200, "sale_price": 3800, "min_stock": 5},
    {"sku": "SP-MTR-NET-3P", "name": "Bi-Directional Net Meter (DISCOM Compliant 3-Phase)", "category": ProductCategory.BOS, "is_serialised": True, "warranty_years": 2, "cost_price": 8500, "sale_price": 12500, "min_stock": 3},

    # Services
    {"sku": "SP-SRV-INST-1KW", "name": "Standard Rooftop Installation & Commissioning 1kW", "category": ProductCategory.SERVICE, "is_serialised": False, "warranty_years": 1, "cost_price": 4000, "sale_price": 8000, "min_stock": 0},
    {"sku": "SP-SRV-INST-3KW", "name": "Standard Rooftop Installation & Commissioning 3kW", "category": ProductCategory.SERVICE, "is_serialised": False, "warranty_years": 1, "cost_price": 8000, "sale_price": 15000, "min_stock": 0},
    {"sku": "SP-SRV-INST-5KW", "name": "Commercial Rooftop Installation & Commissioning 5kW", "category": ProductCategory.SERVICE, "is_serialised": False, "warranty_years": 1, "cost_price": 12000, "sale_price": 24000, "min_stock": 0},
]


def _on_grid_lines(kw: int):
    inverter = {1: "SP-INV-1KW-OG", 2: "SP-INV-2KW-OG", 3: "SP-INV-3KW-OG"}.get(kw, "SP-INV-5KW-OG")
    return [
        ("SP-PNL-540W", math.ceil(kw * 1000 / 540)),
        (inverter, 1),
        ("SP-MTR-NET-3P", 1),
    ] + _bos_lines(kw)


def _off_grid_lines(kw: int):
    return [
        ("SP-PNL-540W", math.ceil(kw * 1000 / 540)),
        ("SP-INV-3KW-HYB" if kw <= 3 else "SP-INV-5KW-HYB", 1),
        ("SP-BAT-5KWH-LFP" if kw <= 3 else "SP-BAT-10KWH-LFP", 1),
        ("SP-CC-60A-MPPT", 1),
    ] + _bos_lines(kw)


def _bos_lines(kw: int):
    return [
        ("SP-BOS-DCDB-1P", 1),
        ("SP-BOS-ACDB-1P", 1),
        ("SP-BOS-EARTH-KIT", 1 if kw <= 3 else 2),
        ("SP-BOS-LA-COPPER", 1),
        ("SP-BOS-STR-GI-3KW", math.ceil(kw / 3)),
        ("SP-CAB-DC-4MM", math.ceil(kw / 3)),
        ("SP-CAB-AC-6MM", 1),
        ("SP-CON-MC4", math.ceil(kw / 2)),
        ("SP-SRV-INST-1KW" if kw <= 1 else "SP-SRV-INST-3KW" if kw <= 3 else "SP-SRV-INST-5KW", 1),
    ]


BOM_TEMPLATES = [
    {"name": f"{kw} kW On-Grid System", "capacity_kw": float(kw), "system_type": "On-Grid",
     "description": f"Grid-tied {kw} kW rooftop system with net-metering. Eligible for PM Surya Ghar subsidy.",
     "lines": _on_grid_lines(kw)}
    for kw in range(1, 6)
] + [
    {"name": f"{kw} kW Off-Grid System", "capacity_kw": float(kw), "system_type": "Off-Grid",
     "description": f"Battery-backed {kw} kW system. Not eligible for grid-connected subsidies.",
     "lines": _off_grid_lines(kw)}
    for kw in range(1, 6)
]

SCHEMES = [
    {
        "name": "PM Surya Ghar: Muft Bijli Yojana",
        "description": "National rooftop solar scheme of the Ministry of New and Renewable Energy (MNRE) providing central financial assistance (CFA) to households for grid-connected rooftop solar.",
        "eligibility": "Residential households with a valid electricity connection and a suitable roof. Grid-connected (On-Grid) systems with net-metering only; Off-Grid systems are not eligible.",
        "benefit_amounts": "CFA per kW for the first 2 kW, a lower rate for the 3rd kW, capped at the maximum for 3 kW and above. Amounts below are admin-editable; always confirm current values on the official portal.",
        "how_to_apply": "1. Register on pmsuryaghar.gov.in with your DISCOM consumer number.\n2. Apply and obtain feasibility approval.\n3. Install through a registered vendor.\n4. Submit installation details and apply for net-metering.\n5. DISCOM inspection and commissioning.\n6. Claim the subsidy; it is credited to your bank account.",
        "official_link": "https://pmsuryaghar.gov.in",
        "state": "National / All India",
        "cfa_per_kw_first_2kw": 30000.0,
        "cfa_per_kw_3rd_kw": 18000.0,
        "cfa_max": 78000.0,
        "state_topup_per_kw": 0.0,
        "grid_connected_only": True,
    },
]


def load_catalog() -> dict:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    counts = {"products": 0, "bom_templates": 0, "schemes": 0}
    try:
        products = {}
        for p in PRODUCTS:
            prod = db.query(Product).filter(Product.sku == p["sku"]).first()
            if not prod:
                prod = Product(
                    sku=p["sku"], name=p["name"], category=p["category"], is_serialised=p["is_serialised"],
                    warranty_years=p["warranty_years"], cost_price=p["cost_price"], sale_price=p["sale_price"],
                    stock_quantity=0, min_stock_alert=p["min_stock"],
                )
                db.add(prod)
                db.flush()
                counts["products"] += 1
            products[p["sku"]] = prod

        for t in BOM_TEMPLATES:
            if db.query(BOMTemplate).filter(BOMTemplate.name == t["name"]).first():
                continue
            tpl = BOMTemplate(name=t["name"], capacity_kw=t["capacity_kw"], system_type=t["system_type"], description=t["description"])
            db.add(tpl)
            db.flush()
            for sku, qty in t["lines"]:
                db.add(BOMLine(template_id=tpl.id, product_id=products[sku].id, quantity=qty))
            counts["bom_templates"] += 1

        for s in SCHEMES:
            if not db.query(GovernmentScheme).filter(GovernmentScheme.name == s["name"]).first():
                db.add(GovernmentScheme(is_active=True, is_announcement=False, **s))
                counts["schemes"] += 1

        db.commit()
    finally:
        db.close()
    return counts


if __name__ == "__main__":
    c = load_catalog()
    print(f"Configuration loaded: {c['products']} products, {c['bom_templates']} BOM templates, {c['schemes']} schemes added (existing rows kept).")
