#!/usr/bin/env python3
"""artifact_report.html をコンビニ印刷用にA4 PDF化する"""
from pathlib import Path
from playwright.sync_api import sync_playwright

SRC = Path(__file__).parent / "artifact_report.html"
OUT = Path(__file__).parent / "kino_onsen_500m_report.pdf"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    page = browser.new_page()
    page.goto(f"file://{SRC.resolve()}")
    page.wait_for_timeout(1500)  # allow web fonts (or fallback) to settle
    page.pdf(
        path=str(OUT),
        format="A4",
        print_background=True,
        margin={"top": "12mm", "bottom": "12mm", "left": "10mm", "right": "10mm"},
    )
    browser.close()

print(f"saved: {OUT}")
