#!/usr/bin/env python3
"""Generic themed Markdown -> .docx renderer for HomeLink report docs.
Handles: #/##/### headings, > blockquote, --- hr, - bullets (nested by indent),
1. numbered lists, | pipe tables |, ``` code fences ```, and **bold**/*italic*/`code` inline.

Usage: render_report.py <in.md> <out.docx> "Title" "Subtitle" "Tagline" "Footer text"
"""
import re
import sys
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

BRAND  = RGBColor(0x14, 0x6C, 0x60)
INK    = RGBColor(0x1F, 0x2A, 0x28)
MUTED  = RGBColor(0x6B, 0x77, 0x74)
ACCENT = RGBColor(0xC2, 0x6A, 0x1A)
HDR_FILL = "146C60"
ROW_FILL = "F0F5F4"

INLINE = re.compile(r"(\*\*.+?\*\*|\*.+?\*|`.+?`)")

def run(p, text, *, bold=False, italic=False, size=None, color=None, font="Calibri"):
    r = p.add_run(text); r.bold = bold; r.italic = italic; r.font.name = font
    if size: r.font.size = Pt(size)
    if color: r.font.color.rgb = color
    return r

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

def shade(cell, hexfill):
    tcpr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), hexfill)
    tcpr.append(shd)

def base_style(doc):
    st = doc.styles["Normal"]
    st.font.name = "Calibri"; st.font.size = Pt(10.5); st.font.color.rgb = INK
    for i, c, sz in ((1, BRAND, 17), (2, BRAND, 13.5), (3, ACCENT, 11.5)):
        h = doc.styles[f"Heading {i}"]
        h.font.name = "Calibri"; h.font.color.rgb = c; h.font.size = Pt(sz); h.font.bold = True

def cover(doc, title, subtitle, tagline):
    p = doc.add_paragraph(); run(p, "HOMELINK", bold=True, size=11, color=ACCENT)
    p.paragraph_format.space_after = Pt(2)
    p = doc.add_paragraph(); run(p, title, bold=True, size=24, color=BRAND)
    p.paragraph_format.space_after = Pt(2)
    p = doc.add_paragraph(); run(p, subtitle, size=12, color=MUTED)
    p.paragraph_format.space_after = Pt(8)
    if tagline:
        p = doc.add_paragraph(); run(p, tagline, italic=True, size=11, color=INK)
    meta = doc.add_paragraph()
    run(meta, "Date 2026-07-20    ·    Stage: Pre-build brainstorm    ·    Status: Draft for team review",
        size=9, color=MUTED)
    hr = doc.add_paragraph(); run(hr, "_" * 82, color=RGBColor(0xD9, 0xE2, 0xE0))

def footer(doc, text):
    for section in doc.sections:
        p = section.footer.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run(p, text, size=8, color=MUTED)

def add_table(doc, rows):
    header, body = rows[0], rows[1:]
    t = doc.add_table(rows=1, cols=len(header)); t.style = "Table Grid"
    for i, cellname in enumerate(header):
        c = t.rows[0].cells[i]; c.text = ""; shade(c, HDR_FILL)
        add_inline(c.paragraphs[0], cellname, base_color=RGBColor(0xFF, 0xFF, 0xFF), size=10)
        for r in c.paragraphs[0].runs: r.bold = True
    for ri, row in enumerate(body):
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ""
            add_inline(cells[i].paragraphs[0], val, size=10)
            if ri % 2 == 1: shade(cells[i], ROW_FILL)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def parse_table_row(line):
    parts = [c.strip() for c in line.strip().strip("|").split("|")]
    return parts

def render(md_path, docx_path, title, subtitle, tagline, footer_text):
    doc = Document(); base_style(doc)
    for m in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(doc.sections[0], m, Cm(2.0))
    cover(doc, title, subtitle, tagline)

    with open(md_path, encoding="utf-8") as f:
        lines = f.read().split("\n")

    i, started, in_code, code_buf, table_buf = 0, False, False, [], []
    def flush_table():
        nonlocal table_buf
        if table_buf:
            rows = [parse_table_row(l) for l in table_buf if not re.match(r"^\s*\|?[\s:-]+\|", l)]
            rows = [r for r in rows if any(c for c in r)]
            if rows: add_table(doc, rows)
            table_buf = []

    while i < len(lines):
        line = lines[i].rstrip(); i += 1
        # skip markdown title + meta block until first hr
        if not started:
            if line.strip() == "---": started = True
            continue
        # code fence
        if line.strip().startswith("```"):
            if in_code:
                p = doc.add_paragraph(); shade_para = p
                for cl in code_buf:
                    run(p, cl + "\n", size=9, color=INK, font="Consolas")
                p.paragraph_format.left_indent = Pt(10)
                in_code = False; code_buf = []
            else:
                in_code = True
            continue
        if in_code:
            code_buf.append(line); continue
        # tables
        if line.strip().startswith("|"):
            table_buf.append(line); continue
        else:
            flush_table()
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
        elif re.match(r"^(\s*)- ", line):
            indent = len(re.match(r"^(\s*)", line).group(1))
            lvl = 1 if indent < 2 else (2 if indent < 4 else 3)
            style = "List Bullet" if lvl == 1 else f"List Bullet {lvl}"
            try: p = doc.add_paragraph(style=style)
            except KeyError: p = doc.add_paragraph(style="List Bullet")
            add_inline(p, line.strip()[2:])
        elif re.match(r"^\d+\. ", line):
            p = doc.add_paragraph(style="List Number"); add_inline(p, re.sub(r"^\d+\. ", "", line))
        else:
            p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(6); add_inline(p, line)
    flush_table()
    footer(doc, footer_text)
    doc.save(docx_path)
    print(f"wrote {docx_path}")

if __name__ == "__main__":
    render(*sys.argv[1:7])
