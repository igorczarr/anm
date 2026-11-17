import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(r"C:\Users\igorc\.gemini\antigravity\brain\30012340-5afd-46e2-8349-34d914c4c5d1")

def set_state(deck, index, mode="SPEAKER_EXPOSITION"):
    cmd = f"npx tsx scripts/set_live_state.ts {deck} {index} {mode}"
    subprocess.run(cmd, cwd=r"c:\Users\igorc\OneDrive\Desktop\anm\arena", shell=True, check=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    # 1. Admin Login via API & Capture
    admin_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    resp = admin_ctx.request.post("http://localhost:3000/api/admin/login", data={"email": "admin@anovamoeda.com.br", "password": "ANM@Arena2026!"})
    print("Admin login status:", resp.status)
    
    page_admin = admin_ctx.new_page()
    page_admin.goto("http://localhost:3000/admin/operacao", wait_until="domcontentloaded")
    time.sleep(3)
    
    shot_admin = OUT / "admin_operacao_slides_card.png"
    page_admin.screenshot(path=str(shot_admin))
    print(f"Captured: {shot_admin}")
    
    # 2. Set to slide 2 (index 1) and reload /arena
    set_state("sergio", 1, "SPEAKER_EXPOSITION")
    
    arena_page = browser.new_page(viewport={"width": 1920, "height": 1080})
    arena_page.goto("http://localhost:3000/arena", wait_until="domcontentloaded")
    time.sleep(3)
    
    shot2 = OUT / "telao_sergio_slide_02_ampliado.png"
    arena_page.screenshot(path=str(shot2))
    print(f"Captured: {shot2}")
    
    browser.close()

print("ALL CAPTURED SUCCESSFULLY!")
