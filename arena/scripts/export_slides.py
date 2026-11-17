"""Exporta os PDFs de slides da Paula para imagens WebP/PNG otimizadas dentro do repositório.

Uso: python scripts/export_slides.py
Saída: arena/public/slides/{intro,closing}/slide-01.webp ... + manifest.json
Os PDFs originais ficam preservados em arena/public/slides/originals/.
"""
import json
import shutil
from pathlib import Path

import fitz  # PyMuPDF

UP = Path(r"C:\Users\igorc\.gemini\antigravity\brain\30012340-5afd-46e2-8349-34d914c4c5d1\.user_uploaded")
ROOT = Path(__file__).resolve().parent.parent / "public" / "slides"

SOURCES = {
    "intro": (UP / "media_1794937143908_4f7e4d06.pdf", "Parte_I_O_que_e_trabalho_(A_Nova_Moeda).pdf"),
    "closing": (UP / "media_1794937144077_f7402b94.pdf", "Parte_II_O_trabalho_hoje_(A_Nova_Moeda).pdf"),
    "sergio": (UP / "media_1794947809469_78023a06.pdf", "Economia_da_Solidao_UEFS_-_Dr._Sergio_Passos_(Apresentacao).pdf"),
}

TARGET_WIDTH = 1920

manifest = {}
(ROOT / "originals").mkdir(parents=True, exist_ok=True)

for key, (src, original_name) in SOURCES.items():
    shutil.copy2(src, ROOT / "originals" / original_name)
    out_dir = ROOT / key
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    doc = fitz.open(src)
    slides = []
    for i, page in enumerate(doc, start=1):
        zoom = TARGET_WIDTH / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        name = f"slide-{i:02d}.png"
        pix.save(out_dir / name)
        slides.append({"src": f"/slides/{key}/{name}", "width": pix.width, "height": pix.height})
    manifest[key] = {
        "title": original_name.rsplit(".", 1)[0],
        "count": len(slides),
        "aspect": round(slides[0]["width"] / slides[0]["height"], 4) if slides else 1.7778,
        "slides": slides,
    }
    print(key, len(slides), "slides", slides[0]["width"], "x", slides[0]["height"])

(ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print("manifest ok")
