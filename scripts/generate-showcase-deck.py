#!/usr/bin/env python3
"""Generate the editable CipherPool showcase deck from verified project facts."""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "showcase" / "presentation"
SCREENSHOT = OUTPUT_DIR / "assets" / "live-dashboard.png"
OUTPUT = OUTPUT_DIR / "CipherPool-Presentation.pptx"

WHITE = RGBColor(255, 255, 255)
INK = RGBColor(20, 31, 55)
MUTED = RGBColor(93, 110, 142)
BLUE = RGBColor(49, 87, 246)
BLUE_DARK = RGBColor(24, 53, 159)
BLUE_PALE = RGBColor(239, 243, 255)
LINE = RGBColor(207, 217, 241)
GREEN = RGBColor(8, 127, 91)
GREEN_PALE = RGBColor(229, 249, 241)
AMBER = RGBColor(145, 82, 0)
AMBER_PALE = RGBColor(255, 244, 214)
FONT = "Liberation Sans"
MONO = "Liberation Mono"


def add_text(slide, text, x, y, w, h, *, size=18, color=INK, bold=False,
             font=FONT, align=PP_ALIGN.LEFT, valign=MSO_ANCHOR.TOP,
             margin=0.02, line_spacing=1.0):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.clear()
    frame.margin_left = Inches(margin)
    frame.margin_right = Inches(margin)
    frame.margin_top = Inches(margin)
    frame.margin_bottom = Inches(margin)
    frame.vertical_anchor = valign
    paragraph = frame.paragraphs[0]
    paragraph.alignment = align
    paragraph.line_spacing = line_spacing
    run = paragraph.add_run()
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return box


def add_rich_text(slide, segments, x, y, w, h, *, size=18, color=INK,
                  align=PP_ALIGN.LEFT, valign=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.clear()
    frame.margin_left = frame.margin_right = Inches(0.02)
    frame.margin_top = frame.margin_bottom = Inches(0.02)
    frame.vertical_anchor = valign
    paragraph = frame.paragraphs[0]
    paragraph.alignment = align
    for text, segment_color, bold in segments:
        run = paragraph.add_run()
        run.text = text
        run.font.name = FONT
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = segment_color or color
    return box


def add_link(slide, label, url, x, y, w, h, *, size=12, color=BLUE, font=MONO):
    box = add_text(slide, "", x, y, w, h, size=size, color=color, font=font)
    paragraph = box.text_frame.paragraphs[0]
    run = paragraph.add_run()
    run.text = label
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = True
    run.font.color.rgb = color
    run.hyperlink.address = url
    return box


def add_box(slide, x, y, w, h, *, fill=WHITE, line=LINE, radius=True):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    box = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    box.fill.solid()
    box.fill.fore_color.rgb = fill
    box.line.color.rgb = line
    box.line.width = Pt(1)
    return box


def add_pill(slide, text, x, y, w, *, fill=BLUE_PALE, color=BLUE):
    pill = add_box(slide, x, y, w, 0.32, fill=fill, line=fill)
    add_text(slide, text.upper(), x + 0.08, y + 0.02, w - 0.16, 0.24,
             size=8, color=color, bold=True, valign=MSO_ANCHOR.MIDDLE)
    return pill


def add_brand(slide, number):
    mark = add_box(slide, 0.58, 0.28, 0.34, 0.34, fill=BLUE, line=BLUE)
    add_text(slide, "C", 0.58, 0.285, 0.34, 0.28, size=13, color=WHITE,
             bold=True, align=PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
    add_text(slide, "CipherPool", 1.02, 0.3, 1.5, 0.28, size=12, bold=True)
    add_text(slide, "RESEARCH DEPLOYMENT · ETHEREUM SEPOLIA", 8.55, 0.34, 3.65, 0.2,
             size=7, color=MUTED, font=MONO, align=PP_ALIGN.RIGHT)
    add_text(slide, f"{number:02d} / 10", 12.22, 0.34, 0.54, 0.2,
             size=7, color=MUTED, font=MONO, align=PP_ALIGN.RIGHT)
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.06))
    line.fill.solid()
    line.fill.fore_color.rgb = BLUE
    line.line.fill.background()


def add_footer(slide, text="Verified claims and links: docs/showcase/SUBMISSION_OVERVIEW.md"):
    add_text(slide, text, 0.62, 7.12, 12.1, 0.18, size=7, color=MUTED, font=MONO)


def add_title(slide, kicker, title, subtitle=None):
    add_text(slide, kicker.upper(), 0.65, 0.83, 5.5, 0.24, size=8, color=BLUE, bold=True, font=MONO)
    add_text(slide, title, 0.65, 1.1, 12.0, 0.78, size=30, color=INK, bold=True)
    if subtitle:
        add_text(slide, subtitle, 0.67, 1.88, 11.3, 0.5, size=13, color=MUTED, line_spacing=1.1)


def add_card_heading(slide, number, heading, body, x, y, w, h, *, accent=BLUE):
    add_box(slide, x, y, w, h, fill=WHITE, line=LINE)
    add_pill(slide, number, x + 0.25, y + 0.25, 0.62, fill=BLUE_PALE, color=accent)
    add_text(slide, heading, x + 0.25, y + 0.78, w - 0.5, 0.55, size=17, bold=True)
    add_text(slide, body, x + 0.25, y + 1.42, w - 0.5, h - 1.65, size=11, color=MUTED, line_spacing=1.15)


def slide_1(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 1)
    add_pill(slide, "Zama fhEVM · Confidential finance", 0.72, 1.15, 2.7)
    add_rich_text(slide, [("Private prize savings,\n", INK, True), ("built for verification.", BLUE, True)],
                  0.72, 1.72, 7.3, 1.75, size=36)
    add_text(slide, "Principal stays withdrawable while encrypted balances and ticket weights stay confidential.",
             0.75, 3.68, 6.55, 0.68, size=17, color=MUTED, line_spacing=1.15)
    add_link(slide, "cipherpool-beta.vercel.app", "https://cipherpool-beta.vercel.app",
             0.75, 4.62, 4.2, 0.35, size=12)
    add_box(slide, 8.35, 1.3, 4.2, 4.9, fill=BLUE_DARK, line=BLUE_DARK)
    for x, y, size, alpha_color in [(8.85, 1.78, 2.65, RGBColor(63, 95, 224)), (9.25, 2.18, 1.85, RGBColor(84, 114, 236)), (9.65, 2.58, 1.05, BLUE)]:
        circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(size), Inches(size))
        circle.fill.solid(); circle.fill.fore_color.rgb = alpha_color
        circle.line.fill.background()
    add_text(slide, "FHE", 9.64, 3.02, 1.1, 0.5, size=22, color=WHITE, bold=True,
             align=PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
    add_text(slide, "PUBLIC CUSTODY", 8.85, 4.95, 3.2, 0.25, size=8, color=RGBColor(205, 218, 255), font=MONO)
    add_text(slide, "PRIVATE ACCOUNTING", 8.85, 5.3, 3.2, 0.3, size=16, color=WHITE, bold=True)
    add_pill(slide, "Research software · not production", 0.75, 5.85, 2.7, fill=AMBER_PALE, color=AMBER)
    add_footer(slide)


def slide_2(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 2)
    add_title(slide, "The problem", "Public ledgers expose private financial context", "Auditability should not require publishing every saver’s position.")
    add_card_heading(slide, "01", "Balance exposure", "Wallet history can reveal a saver’s position, deposits, withdrawals, and changing financial behavior.", 0.65, 2.65, 3.9, 3.55)
    add_card_heading(slide, "02", "Visible ticket weights", "Transparent weights make whale activity easy to track and can disclose each participant’s relative odds.", 4.72, 2.65, 3.9, 3.55)
    add_card_heading(slide, "03", "Timing reveals intent", "Pending deposits and last-minute entries expose behavior around a prize round before it settles.", 8.79, 2.65, 3.9, 3.55)
    add_footer(slide)


def slide_3(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 3)
    add_title(slide, "The solution", "Public custody. Confidential accounting.", "CipherPool separates what must be auditable from what should remain private.")
    add_box(slide, 0.68, 2.55, 5.75, 3.65, fill=WHITE, line=LINE)
    add_pill(slide, "Public · independently verifiable", 0.98, 2.87, 2.45, fill=GREEN_PALE, color=GREEN)
    add_text(slide, "Custody layer", 0.98, 3.42, 4.7, 0.42, size=22, bold=True)
    add_text(slide, "• Deposited testnet cUSDC\n• Contract and custody bindings\n• Transaction receipts\n• Aggregate solvency", 0.98, 4.05, 4.65, 1.6, size=14, color=MUTED, line_spacing=1.25)
    arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(6.12), Inches(3.85), Inches(1.1), Inches(0.7))
    arrow.fill.solid(); arrow.fill.fore_color.rgb = BLUE; arrow.line.fill.background()
    add_box(slide, 6.9, 2.55, 5.75, 3.65, fill=BLUE_PALE, line=RGBColor(178, 195, 255))
    add_pill(slide, "Encrypted · wallet-authorized", 7.2, 2.87, 2.35)
    add_text(slide, "Privacy layer", 7.2, 3.42, 4.7, 0.42, size=22, bold=True)
    add_text(slide, "• Running balances as euint64\n• Weighted draw intervals\n• Prize credits\n• Local balance reveal", 7.2, 4.05, 4.65, 1.6, size=14, color=MUTED, line_spacing=1.25)
    add_footer(slide)


def slide_4(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 4)
    add_title(slide, "Architecture", "A verifiable path from wallet to confidential settlement")
    nodes = [
        (0.7, 2.55, 2.0, "01", "React client", "Encrypts input\nRequests wallet signature", False),
        (3.25, 2.55, 2.0, "02", "Official cUSDC", "Moves encrypted assets\nReturns actual transfer", False),
        (5.8, 2.55, 2.2, "03", "ConfidentialPool", "Owns encrypted positions\nReserve + draw state", True),
        (9.0, 2.55, 2.45, "04", "Zama relayer + KMS", "Prepares authorized proofs\nVerifies public snapshots", True),
        (5.8, 5.25, 2.2, "05", "Indexer + PostgreSQL", "Observes public events\nPersists checkpoints", False),
        (2.05, 5.25, 2.2, "IN", "Sponsor wallet", "Transfers encrypted cUSDC\ninto the prize reserve", False),
    ]
    for x, y, width, number, title, body, highlighted in nodes:
        add_box(slide, x, y, width, 1.75, fill=BLUE_PALE if highlighted else WHITE, line=LINE)
        add_pill(slide, number, x + 0.18, y + 0.2, 0.55)
        add_text(slide, title, x + 0.18, y + 0.68, width - 0.36, 0.38, size=13, bold=True)
        add_text(slide, body, x + 0.18, y + 1.12, width - 0.36, 0.48, size=9, color=MUTED, line_spacing=1.1)

    connectors = [
        (2.7, 3.42, 3.25, 3.42),
        (5.25, 3.42, 5.8, 3.42),
        (8.0, 3.42, 9.0, 3.42),
        (6.9, 4.3, 6.9, 5.25),
        (4.25, 6.12, 5.8, 4.05),
    ]
    for x1, y1, x2, y2 in connectors:
        connector = slide.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2)
        )
        connector.line.color.rgb = BLUE
        connector.line.width = Pt(2)
        connector.line.end_arrowhead = True

    add_box(slide, 9.0, 5.25, 2.45, 1.0, fill=GREEN_PALE, line=GREEN_PALE)
    add_text(slide, "Public: custody + receipts\nPrivate: positions + winner", 9.18, 5.5, 2.1, 0.5,
             size=10, color=GREEN, bold=True, align=PP_ALIGN.CENTER, line_spacing=1.1)
    add_footer(slide)


def slide_5(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 5)
    add_title(slide, "Live product", "The console is live—and honest about connection state")
    if not SCREENSHOT.exists():
        raise FileNotFoundError(f"Capture the live dashboard first: {SCREENSHOT}")
    picture = slide.shapes.add_picture(str(SCREENSHOT), Inches(0.68), Inches(2.05), width=Inches(8.75), height=Inches(5.0))
    picture.line.color.rgb = LINE; picture.line.width = Pt(1)
    add_box(slide, 9.72, 2.05, 2.95, 5.0, fill=BLUE_PALE, line=LINE)
    add_pill(slide, "Production capture", 10.02, 2.37, 1.55)
    add_text(slide, "Clear wallet state", 10.02, 3.0, 2.25, 0.45, size=19, bold=True)
    add_text(slide, "A disconnected user sees only Connect wallet. An address appears only after the provider returns the selected account.", 10.02, 3.58, 2.2, 1.35, size=12, color=MUTED, line_spacing=1.15)
    add_text(slide, "Runtime assurance", 10.02, 5.2, 2.25, 0.32, size=13, bold=True)
    add_text(slide, "Chain, bytecode, and custody bindings are checked before protocol writes.", 10.02, 5.65, 2.2, 0.9, size=11, color=MUTED)
    add_footer(slide, "Captured from https://cipherpool-beta.vercel.app · 4 Sep 2026")


def slide_6(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 6)
    add_title(slide, "User journey", "Four explicit steps. No hidden signing.")
    steps = [
        ("01", "Shield", "Wrap test USDC into confidential cUSDC with Zama's official Sepolia wrapper."),
        ("02", "Save", "Deposit an encrypted cUSDC amount; the pool credits only the token-returned result."),
        ("03", "Prize round", "Fund or monitor the sponsor reserve, then run a KMS-verified encrypted draw."),
        ("04", "Withdraw", "Submit an encrypted amount; accounting follows the token-returned transfer result."),
    ]
    x_positions = [0.7, 3.8, 6.9, 10.0]
    for i, ((number, title, body), x) in enumerate(zip(steps, x_positions)):
        add_box(slide, x, 2.5, 2.55, 3.7, fill=BLUE_PALE if i % 2 else WHITE, line=LINE)
        circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x + 0.25), Inches(2.82), Inches(0.58), Inches(0.58))
        circle.fill.solid(); circle.fill.fore_color.rgb = BLUE; circle.line.fill.background()
        add_text(slide, number, x + 0.25, 2.91, 0.58, 0.25, size=9, color=WHITE, bold=True, font=MONO, align=PP_ALIGN.CENTER)
        add_text(slide, title, x + 0.25, 3.7, 2.05, 0.45, size=20, bold=True)
        add_text(slide, body, x + 0.25, 4.45, 2.05, 1.25, size=11, color=MUTED, line_spacing=1.15)
        if i < 3:
            arrow = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(x + 2.64), Inches(3.85), Inches(0.35), Inches(0.55))
            arrow.fill.solid(); arrow.fill.fore_color.rgb = BLUE; arrow.line.fill.background()
    add_footer(slide)


def slide_7(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 7)
    add_title(slide, "Security controls", "Solvency and settlement invariants are enforced in code")
    controls = [
        ("Asset-bound credit", "Encrypted deposit credit is derived from the token-returned custody amount."),
        ("Reserved prizes", "Each draw consumes verified sponsor funds so assets cannot fund repeated awards."),
        ("Complete liabilities", "Winner credit enters both the encrypted position and aggregate at finalization."),
        ("Bound draw proofs", "KMS evidence must match the stored aggregate and reserve handles."),
        ("Timeout recovery", "Anyone can release a stale draw lock after the 24-hour cancellation delay."),
    ]
    y = 2.35
    for i, (title, body) in enumerate(controls):
        fill = BLUE_PALE if i % 2 == 0 else WHITE
        add_box(slide, 0.72, y, 11.9, 0.76, fill=fill, line=LINE)
        add_pill(slide, f"0{i + 1}", 0.97, y + 0.22, 0.55, fill=GREEN_PALE, color=GREEN)
        add_text(slide, title, 1.77, y + 0.19, 2.55, 0.34, size=13, bold=True)
        add_text(slide, body, 4.25, y + 0.19, 7.9, 0.36, size=11, color=MUTED)
        y += 0.89
    add_footer(slide)


def slide_8(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 8)
    add_title(slide, "Verified evidence", "A complete live prize round—not a simulated receipt", "Each transaction below links directly to its confirmed block-explorer record.")
    txs = [
        ("01", "cUSDC deposit", "0xe36db7…b39f", "Encrypted position", "https://sepolia.etherscan.io/tx/0xe36db7ad47a927811971b56166ced5dd5ffa388d368f54623d09d7124ca8b39f"),
        ("02", "KMS draw", "0x504862…ce6c", "Draw 1 finalized", "https://sepolia.etherscan.io/tx/0x504862de2aa5ad002f2314ea834b5336d394e9bf111c5652bb16c8700a1ece6c"),
        ("03", "Private claim", "0x5763be…c969", "Ordinary withdrawal", "https://sepolia.etherscan.io/tx/0x5763bef70ffc5954c640cb1b5c39cad4bf8a56e45b37caa09e55b861184bc969"),
    ]
    for i, (number, title, short_hash, result, url) in enumerate(txs):
        x = 0.72 + i * 4.05
        add_box(slide, x, 2.72, 3.72, 2.78, fill=BLUE_PALE if i == 1 else WHITE, line=LINE)
        add_pill(slide, number, x + 0.25, 2.98, 0.55)
        add_text(slide, title, x + 0.25, 3.55, 3.1, 0.4, size=17, bold=True)
        add_link(slide, short_hash, url, x + 0.25, 4.22, 3.0, 0.3, size=12)
        add_text(slide, result, x + 0.25, 4.82, 3.0, 0.3, size=11, color=GREEN, bold=True)
    add_box(slide, 2.2, 5.85, 8.95, 0.55, fill=GREEN_PALE, line=GREEN_PALE)
    add_text(slide, "Deposit → KMS draw → private claim → principal withdrawal · all confirmed", 2.35, 6.0, 8.65, 0.28,
             size=12, color=GREEN, bold=True, align=PP_ALIGN.CENTER)
    add_footer(slide, "Full hashes and runtime evidence: docs/operations/sepolia-deployment.md")


def slide_9(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 9)
    add_title(slide, "Engineering proof", "Reproducible tests—and durable live infrastructure")
    add_box(slide, 0.7, 2.35, 4.1, 3.85, fill=BLUE_DARK, line=BLUE_DARK)
    add_text(slide, "FULL", 1.0, 2.8, 3.5, 1.0, size=48, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, "VALIDATION SUITE", 1.0, 3.9, 3.5, 0.35, size=10, color=RGBColor(205, 218, 255), bold=True, font=MONO, align=PP_ALIGN.CENTER)
    add_text(slide, "Foundry contracts · backend API/indexer\nclient encryption · frontend UX", 1.0, 4.58, 3.5, 1.0, size=13, color=WHITE, align=PP_ALIGN.CENTER, line_spacing=1.2)
    infra = [
        ("Vercel", "React frontend", "Production UI"),
        ("Render", "Node indexer/API", "Public API"),
        ("Neon", "PostgreSQL checkpoint", "Restart recovery"),
    ]
    for i, (name, role, proof) in enumerate(infra):
        y = 2.35 + i * 1.28
        add_box(slide, 5.15, y, 7.45, 1.02, fill=BLUE_PALE if i % 2 == 0 else WHITE, line=LINE)
        add_text(slide, name, 5.45, y + 0.24, 1.3, 0.32, size=15, bold=True)
        add_text(slide, role, 7.0, y + 0.24, 2.75, 0.32, size=12, color=MUTED)
        add_pill(slide, proof, 10.15, y + 0.33, 1.95, fill=GREEN_PALE, color=GREEN)
    add_box(slide, 5.15, 6.1, 7.45, 0.45, fill=GREEN_PALE, line=GREEN_PALE)
    add_text(slide, "Indexer checkpoint restored successfully after a live service restart", 5.35, 6.2, 7.0, 0.23, size=10, color=GREEN, bold=True)
    add_footer(slide)


def slide_10(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = WHITE
    add_brand(slide, 10)
    add_pill(slide, "Open research · verifiable evidence", 0.72, 1.25, 2.55)
    add_rich_text(slide, [("Confidential savings,\n", INK, True), ("without blind trust.", BLUE, True)],
                  0.72, 1.8, 7.8, 1.5, size=38)
    add_text(slide, "Try the live app. Inspect the active Sepolia deployment. Review every invariant and test.",
             0.75, 3.65, 7.1, 0.65, size=17, color=MUTED)
    add_link(slide, "cipherpool-beta.vercel.app", "https://cipherpool-beta.vercel.app", 0.75, 4.65, 4.5, 0.36, size=14)
    add_link(slide, "github.com/Webghost01-NG/fhevm-pooltogether-security", "https://github.com/Webghost01-NG/fhevm-pooltogether-security", 0.75, 5.18, 6.6, 0.36, size=11)
    add_box(slide, 8.6, 1.55, 3.75, 4.65, fill=BLUE_PALE, line=LINE)
    add_text(slide, "ACTIVE POOL", 8.95, 1.95, 2.8, 0.25, size=8, color=BLUE, bold=True, font=MONO)
    add_text(slide, "0x9c939b82\na1B23b77\n746f934A\n1Ff2b9a5\nbCf191e0", 8.95, 2.55, 2.8, 2.25, size=18, color=INK, bold=True, font=MONO, line_spacing=1.05)
    add_pill(slide, "Ethereum Sepolia", 8.95, 5.25, 1.6, fill=GREEN_PALE, color=GREEN)
    add_footer(slide, "CipherPool · Zama fhEVM · Research deployment")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    for builder in (slide_1, slide_2, slide_3, slide_4, slide_5, slide_6, slide_7, slide_8, slide_9, slide_10):
        builder(prs)
    prs.core_properties.title = "CipherPool — Private Prize Savings"
    prs.core_properties.subject = "Verified Zama fhEVM research deployment showcase"
    prs.core_properties.author = "CipherPool contributors"
    prs.core_properties.comments = "Generated from repository-verified facts; no fabricated transactions or production claims."
    prs.save(OUTPUT)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
