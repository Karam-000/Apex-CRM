"""PDF generation for quotes and invoices (fpdf2)."""
from __future__ import annotations

from fpdf import FPDF


def _header(title: str) -> FPDF:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "Apex CRM")
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, title)
    pdf.ln(12)
    pdf.set_font("Helvetica", size=10)
    return pdf


def _line(pdf: FPDF, text: str, height: int = 6) -> None:
    pdf.cell(0, height, text)
    pdf.ln(height)


def build_quote_pdf(quote, lines) -> bytes:
    pdf = _header(f"Quote {quote.quote_number}")
    _line(pdf, f"Status: {quote.status}")
    _line(pdf, f"Account: {quote.account_id or '-'}    Contact: {quote.contact_id or '-'}")
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(80, 8, "Description", border=1)
    pdf.cell(20, 8, "Qty", border=1, align="R")
    pdf.cell(30, 8, "Unit", border=1, align="R")
    pdf.cell(20, 8, "Tax%", border=1, align="R")
    pdf.cell(30, 8, "Total", border=1, align="R")
    pdf.ln(8)
    pdf.set_font("Helvetica", size=10)
    for ln in lines:
        pdf.cell(80, 8, (ln.description or "")[:42], border=1)
        pdf.cell(20, 8, f"{ln.quantity:g}", border=1, align="R")
        pdf.cell(30, 8, f"{ln.unit_price:,.2f}", border=1, align="R")
        pdf.cell(20, 8, f"{ln.tax_rate:g}", border=1, align="R")
        pdf.cell(30, 8, f"{ln.line_total:,.2f}", border=1, align="R")
        pdf.ln(8)

    pdf.ln(2)
    _line(pdf, f"Subtotal: {quote.subtotal:,.2f}")
    _line(pdf, f"Tax: {quote.tax:,.2f}")
    pdf.set_font("Helvetica", "B", 12)
    _line(pdf, f"Total: {quote.total:,.2f}", height=8)
    return bytes(pdf.output())


def build_invoice_pdf(invoice) -> bytes:
    pdf = _header(f"Invoice {invoice.invoice_number}")
    _line(pdf, f"Status: {invoice.status}")
    _line(pdf, f"Account: {invoice.account_id or '-'}")
    issue = invoice.issue_date.strftime("%Y-%m-%d") if invoice.issue_date else "-"
    due = invoice.due_date.strftime("%Y-%m-%d") if invoice.due_date else "-"
    _line(pdf, f"Issued: {issue}    Due: {due}")
    pdf.ln(2)
    _line(pdf, f"Subtotal: {float(invoice.subtotal or 0):,.2f}")
    _line(pdf, f"Tax: {float(invoice.tax or 0):,.2f}")
    pdf.set_font("Helvetica", "B", 12)
    _line(pdf, f"Total: {float(invoice.total or 0):,.2f}", height=8)
    return bytes(pdf.output())
