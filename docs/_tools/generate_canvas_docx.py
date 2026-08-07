#!/usr/bin/env python3
"""Well-formatted HomeLink docx generator.
- Summary  -> classic Lean Canvas grid (9 blocks) + cover
- Detailed -> themed, sectioned report parsed from its markdown
"""
import re
from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT = "/Users/diemu/dodoc137/dodoc137/homelink/docs/01-lean-canvas"

BRAND   = RGBColor(0x14, 0x6C, 0x60)   # deep teal
INK     = RGBColor(0x1F, 0x2A, 0x28)   # near-black
MUTED   = RGBColor(0x6B, 0x77, 0x74)   # grey
ACCENT  = RGBColor(0xC2, 0x6A, 0x1A)   # warm amber
TITLE_SHADE = "E8F1EF"                  # light teal
CELL_SHADE  = "F6F8F7"

# ---------- low-level helpers ----------

def shade(cell, hexfill):
    tcpr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), hexfill)
    tcpr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=120, right=120):
    tcpr = cell._tc.get_or_add_tcPr()
    m = OxmlElement("w:tcMar")
    for tag, val in (("top", top), ("bottom", bottom), ("start", left), ("end", right)):
        e = OxmlElement(f"w:{tag}"); e.set(qn("w:w"), str(val)); e.set(qn("w:type"), "dxa"); m.append(e)
    tcpr.append(m)

def set_col_widths(table, widths):
    table.autofit = False
    for row in table.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = w

def no_border(table):
    tbl = table._tbl
    tblPr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{edge}")
        e.set(qn("w:val"), "single"); e.set(qn("w:sz"), "4")
        e.set(qn("w:space"), "0"); e.set(qn("w:color"), "FFFFFF")
        borders.append(e)
    tblPr.append(borders)

def run(p, text, *, bold=False, italic=False, size=None, color=None, font="Calibri"):
    r = p.add_run(text); r.bold = bold; r.italic = italic
    r.font.name = font
    if size: r.font.size = Pt(size)
    if color: r.font.color.rgb = color
    return r

INLINE = re.compile(r"(\*\*.+?\*\*|\*.+?\*|`.+?`)")

def add_inline(p, text, base_color=INK, size=10.5):
    for part in INLINE.split(text):
        if not part: continue
        if part.startswith("**") and part.endswith("**"):
            run(p, part[2:-2], bold=True, size=size, color=base_color)
        elif part.startswith("`") and part.endswith("`"):
            run(p, part[1:-1], size=size-0.5, color=INK, font="Consolas")
        elif part.startswith("*") and part.endswith("*"):
            run(p, part[1:-1], italic=True, size=size, color=MUTED)
        else:
            run(p, part, size=size, color=base_color)

def footer(doc, text):
    for section in doc.sections:
        p = section.footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run(p, text, size=8, color=MUTED)

def base_style(doc):
    st = doc.styles["Normal"]
    st.font.name = "Calibri"; st.font.size = Pt(10.5); st.font.color.rgb = INK
    for i, c in ((1, BRAND), (2, BRAND), (3, ACCENT)):
        h = doc.styles[f"Heading {i}"]
        h.font.name = "Calibri"; h.font.color.rgb = c
        h.font.size = Pt(16 - (i-1)*3); h.font.bold = True

def cover(doc, title, subtitle, tagline):
    p = doc.add_paragraph(); run(p, "HOMELINK", bold=True, size=11, color=ACCENT)
    p.paragraph_format.space_after = Pt(2)
    p = doc.add_paragraph(); run(p, title, bold=True, size=26, color=BRAND)
    p.paragraph_format.space_after = Pt(2)
    p = doc.add_paragraph(); run(p, subtitle, size=12, color=MUTED)
    p.paragraph_format.space_after = Pt(10)
    p = doc.add_paragraph(); run(p, tagline, italic=True, size=11, color=INK)
    meta = doc.add_paragraph()
    run(meta, "Date 2026-07-20    ·    Stage: Pre-build brainstorm    ·    Status: Draft for team review",
        size=9, color=MUTED)
    hr = doc.add_paragraph(); run(hr, "_" * 78, color=RGBColor(0xD9,0xE2,0xE0))

# ---------- SUMMARY: Lean Canvas grid ----------

def cell_block(cell, num, title, lines, *, shade_title=True):
    cell.text = ""
    shade(cell, CELL_SHADE); set_cell_margins(cell)
    p = cell.paragraphs[0]; p.paragraph_format.space_after = Pt(3)
    run(p, f"{num}  ", bold=True, size=10, color=ACCENT)
    run(p, title.upper(), bold=True, size=10, color=BRAND)
    for ln in lines:
        bp = cell.add_paragraph(); bp.paragraph_format.space_after = Pt(2)
        bp.paragraph_format.left_indent = Pt(2)
        if ln.startswith("- "):
            run(bp, "▪ ", size=8, color=ACCENT); add_inline(bp, ln[2:], size=9.5)
        else:
            add_inline(bp, ln, size=9.5)

def build_summary():
    doc = Document()
    base_style(doc)
    sec = doc.sections[0]
    sec.orientation = WD_ORIENT.LANDSCAPE
    sec.page_width, sec.page_height = sec.page_height, sec.page_width
    for m in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(sec, m, Cm(1.4))

    cover(doc, "Lean Canvas", "One-page snapshot, Summary",
          "“Land in Rwanda with everything ready.”")

    # top grid: 5 cols x 2 rows
    t = doc.add_table(rows=2, cols=5)
    no_border(t)
    W = [Cm(5.0), Cm(5.0), Cm(5.4), Cm(5.0), Cm(5.0)]
    set_col_widths(t, W)

    # merges
    t.cell(0,0).merge(t.cell(1,0))   # Problem
    t.cell(0,2).merge(t.cell(1,2))   # UVP
    t.cell(0,4).merge(t.cell(1,4))   # Customer Segments

    cell_block(t.cell(0,0), "1", "Problem", [
        "- From abroad: low-trust, fragmented (WhatsApp, relatives, informal brokers)",
        "- Arrival is disjointed: stay, car, plans all separate & unguaranteed",
        "- Local market informal: opaque pricing, broker gatekeeping",
        "*Alt: Airbnb/Booking (thin), FB/WhatsApp, personal networks, brokers*",
    ])
    cell_block(t.cell(0,1), "4", "Solution", [
        "- Concierge-verified stays (inspected, photographed, guaranteed)",
        "- One Trip = stay + car + tour, intent-routed, never forced",
        "- Escrow-backed multi-rail payments",
        "- In-app messaging + notifications (guest, supply, ops)",
    ])
    cell_block(t.cell(1,1), "8", "Key Metrics", [
        "- Verified listings live · Trips booked",
        "- Bundle attach rate · GMV · take rate",
        "- Repeat/referral · diaspora→property-mgmt",
    ])
    cell_block(t.cell(0,2), "3", "Unique Value Proposition", [
        "**Land in Rwanda with everything ready: a home we've personally verified, "
        "a car waiting, and your days planned. Booked from anywhere, in your currency, guaranteed.**",
        "*Concierge-grade Rwanda, one Trip.*",
    ])
    cell_block(t.cell(0,3), "9", "Unfair Advantage", [
        "- Personally-verified, guaranteed inventory",
        "- Diaspora owners = customers AND supply",
        "- Local ops presence · segment-native UX",
    ])
    cell_block(t.cell(1,3), "5", "Channels", [
        "- Diaspora orgs, churches, WhatsApp/FB groups",
        "- Embassies & events · referral loops",
        "- VISIT Rwanda / tour partners · social · SEO",
    ])
    cell_block(t.cell(0,4), "2", "Customer Segments", [
        "**Beachhead:** returning diaspora Rwandan (medium-term stay + car, pays from abroad)",
        "- VISIT Rwanda tourists (short-term)",
        "- Everyday Rwandans (long-term homes + cars, core)",
    ])

    # bottom grid: 2 cols x 1 row
    b = doc.add_table(rows=1, cols=2)
    no_border(b)
    set_col_widths(b, [Cm(12.9), Cm(12.5)])
    cell_block(b.cell(0,0), "7", "Cost Structure", [
        "- Concierge ops (verification, photography, fulfillment)",
        "- Payment & FX fees · platform build & hosting · partner payouts · CAC",
    ])
    cell_block(b.cell(0,1), "6", "Revenue Streams", [
        "- Booking commission/margin (headline) · property-management %",
        "- Car margin · tour margin · bundle markup · FX spread",
    ])

    footer(doc, "HomeLink, Lean Canvas (Summary)  ·  Confidential draft for team review  ·  2026-07-20")
    doc.save(f"{OUT}/homelink-lean-canvas-summary.docx")
    print("wrote summary")

# ---------- DETAILED: parse markdown ----------

def build_detailed():
    doc = Document()
    base_style(doc)
    for m in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(doc.sections[0], m, Cm(2.0))
    cover(doc, "Lean Canvas", "Expanded companion, Detailed",
          "What each block means, why it matters, and the reasoning behind it.")

    with open(f"{OUT}/homelink-lean-canvas-detailed.md", encoding="utf-8") as f:
        lines = f.read().split("\n")

    # skip the markdown's own title/meta block (up to first '---')
    started = False
    for raw in lines:
        line = raw.rstrip()
        if not started:
            if line.strip() == "---":
                started = True
            continue
        if not line.strip():
            continue
        if line.strip() == "---":
            continue
        if line.startswith("## "):
            doc.add_heading(line[3:], level=2)
        elif line.startswith("### "):
            doc.add_heading(line[4:], level=3)
        elif line.startswith("# "):
            continue
        elif line.startswith("> "):
            p = doc.add_paragraph(); p.paragraph_format.left_indent = Pt(18)
            p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(4)
            add_inline(p, line[2:], base_color=BRAND, size=12)
        elif line.startswith("- "):
            p = doc.add_paragraph(style="List Bullet"); add_inline(p, line[2:])
        elif re.match(r"^\d+\. ", line):
            p = doc.add_paragraph(style="List Number"); add_inline(p, re.sub(r"^\d+\. ", "", line))
        else:
            p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(6)
            add_inline(p, line)

    footer(doc, "HomeLink, Lean Canvas (Detailed)  ·  Confidential draft for team review  ·  2026-07-20")
    doc.save(f"{OUT}/homelink-lean-canvas-detailed.docx")
    print("wrote detailed")

if __name__ == "__main__":
    build_summary()
    build_detailed()
