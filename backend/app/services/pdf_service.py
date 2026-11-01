import os
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from app.core.config import settings


def generate_quote_pdf(quote, customer, lead, template_name: str) -> str:
    """Generates a professional solar quote PDF and returns the local file path."""
    quotes_dir = os.path.join(settings.UPLOAD_DIR, "quotes")
    os.makedirs(quotes_dir, exist_ok=True)
    pdf_filename = f"Quote_{quote.quote_number}.pdf"
    pdf_path = os.path.join(quotes_dir, pdf_filename)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#714B67'),  # Odoo purple
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#017E84'),  # Odoo teal
        spaceAfter=14,
    )
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#212529'),
        spaceBefore=10,
        spaceAfter=6,
    )
    normal_style = ParagraphStyle(
        'NormalSmall',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#333333'),
    )
    bold_style = ParagraphStyle(
        'BoldSmall',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor('#212529'),
    )

    story = []

    # Header
    story.append(Paragraph("RoofRay Solutions", title_style))
    story.append(Paragraph(settings.COMPANY_CONTACT_LINE, subtitle_style))
    story.append(Spacer(1, 10))

    # Meta Table (Customer & Quote details)
    meta_data = [
        [
            Paragraph(f"<b>Customer:</b> {customer.name}<br/><b>Phone:</b> {customer.phone}<br/><b>Address:</b> {customer.address}", normal_style),
            Paragraph(f"<b>Quote No:</b> {quote.quote_number}<br/><b>Date:</b> {quote.created_at.strftime('%d-%b-%Y')}<br/><b>Package:</b> {template_name}", normal_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8F9FA')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Bill of Materials / Items Table
    story.append(Paragraph("System Configuration & Bill of Materials (BOM)", section_title))

    table_data = [
        [
            Paragraph("<b>#</b>", bold_style),
            Paragraph("<b>Item / Specification</b>", bold_style),
            Paragraph("<b>Qty</b>", bold_style),
            Paragraph("<b>Unit Price (₹)</b>", bold_style),
            Paragraph("<b>Total (₹)</b>", bold_style),
        ]
    ]

    for idx, line in enumerate(quote.lines, 1):
        product_name = line.product.name if line.product else "Component"
        table_data.append([
            Paragraph(str(idx), normal_style),
            Paragraph(f"{product_name} ({line.product.warranty_years} yrs warranty)" if line.product else product_name, normal_style),
            Paragraph(str(line.quantity), normal_style),
            Paragraph(f"{line.unit_price:,.2f}", normal_style),
            Paragraph(f"{line.subtotal:,.2f}", normal_style),
        ])

    items_table = Table(table_data, colWidths=[30, 260, 40, 100, 110])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#714B67')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 12))

    # Pricing Summary Table
    summary_data = [
        [Paragraph("<b>Subtotal (Hardware + Installation):</b>", normal_style), Paragraph(f"₹ {quote.subtotal:,.2f}", bold_style)],
        [Paragraph("<b>Govt. Subsidy / Financial Assistance (-):</b>", normal_style), Paragraph(f"- ₹ {quote.subsidy_amount:,.2f}", bold_style)],
        [Paragraph("<b>Applicable GST Taxes (13.8% Composite) (+):</b>", normal_style), Paragraph(f"+ ₹ {quote.tax_amount:,.2f}", bold_style)],
        [Paragraph("<b>Net Customer Payable Amount:</b>", bold_style), Paragraph(f"<b>₹ {quote.total_amount:,.2f}</b>", bold_style)],
    ]
    summary_table = Table(summary_data, colWidths=[350, 190])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E6FFFA')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, colors.HexColor('#017E84')),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 16))

    # Terms & Warranty
    terms_text = (
        "<b>Warranty & Terms:</b><br/>"
        "1. Solar Panels: 20-year performance warranty (linear degradation).<br/>"
        "2. Solar Inverter & Battery Bank: 2-year comprehensive replacement warranty.<br/>"
        "3. Installation & Workmanship: 1-year free maintenance & service support.<br/>"
        "4. Subsidy approval is subject to DISCOM inspection and National Solar Portal verification."
    )
    story.append(Paragraph(terms_text, normal_style))

    doc.build(story)
    return pdf_path



def generate_invoice_pdf(invoice) -> bytes:
    """Invoice PDF built from the stored invoice and its lines."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    cust = invoice.customer
    is_adv = "ADV" in (invoice.invoice_number or "")
    is_final = "FINAL" in (invoice.invoice_number or "") or (invoice.order and invoice.total_amount >= invoice.order.total_amount - 0.01)

    inv_title_suffix = "Advance Payment Invoice (50%)" if is_adv else ("Final Tax Invoice (Full Payment)" if is_final else "Tax Invoice")

    story = [
        Paragraph(f"{settings.PROJECT_NAME} — {inv_title_suffix}", styles["Title"]),
        Paragraph(settings.COMPANY_CONTACT_LINE, styles["Normal"]),
        Spacer(1, 10),
        Paragraph(
            f"<b>Invoice:</b> {invoice.invoice_number}<br/><b>Date:</b> {invoice.created_at:%d-%b-%Y}"
            f"<br/><b>Due:</b> {invoice.due_date:%d-%b-%Y}" if invoice.due_date else
            f"<b>Invoice:</b> {invoice.invoice_number}<br/><b>Date:</b> {invoice.created_at:%d-%b-%Y}",
            styles["Normal"],
        ),
        Paragraph(f"<b>Bill to:</b> {cust.name}<br/>{cust.address or ''}<br/>{cust.phone}", styles["Normal"]),
        Spacer(1, 12),
    ]
    rows = [["Description", "Qty", "Unit price (Rs)", "Amount (Rs)"]]
    for l in invoice.lines:
        rows.append([Paragraph(l.description, styles["Normal"]), str(l.quantity), f"{l.unit_price:,.2f}", f"{l.amount:,.2f}"])
    rows += [
        ["", "", "Subtotal", f"{invoice.subtotal:,.2f}"],
        ["", "", "Tax", f"{invoice.tax_amount:,.2f}"],
        ["", "", "Total Amount", f"{invoice.total_amount:,.2f}"],
    ]
    if invoice.order:
        if is_adv:
            rows.append(["", "", "Advance Paid (50%)", f"{invoice.total_amount:,.2f}"])
            rows.append(["", "", "Remaining on Completion", f"{invoice.order.total_amount - invoice.total_amount:,.2f}"])
        elif is_final and invoice.order.paid_amount >= invoice.order.total_amount - 0.01:
            adv_part = round(invoice.order.total_amount * 0.5, 2)
            fin_part = round(invoice.order.total_amount - adv_part, 2)
            rows.append(["", "", "50% Advance Settled", f"{adv_part:,.2f}"])
            rows.append(["", "", "50% Final Settled", f"{fin_part:,.2f}"])
            rows.append(["", "", "Balance Due", "0.00 (PAID IN FULL)"])
        else:
            rows.append(["", "", "Paid", f"{invoice.order.paid_amount:,.2f}"])
    t = Table(rows, colWidths=[300, 50, 100, 100], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#714B67")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, len(invoice.lines)), 0.5, colors.lightgrey),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (2, -3), (-1, -1), "Helvetica-Bold"),
    ]))
    story += [t, Spacer(1, 12), Paragraph(f"Status: {invoice.status.value}", styles["Normal"])]
    doc.build(story)
    return buf.getvalue()
