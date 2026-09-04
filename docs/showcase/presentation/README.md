# CipherPool Showcase Assets

This directory contains the editable presentation, PDF export, captioned demo video, source copy, and the live-product screenshot used in the materials.

The generated assets were refreshed against the active ERC-7984 deployment on 4 September 2026. Transaction claims link to previously confirmed Sepolia receipts; the video does not simulate a wallet, proof, or new transaction.

## Deliverables

- `CipherPool-Presentation.pptx` — editable 16:9 PowerPoint deck.
- `CipherPool-Presentation.pdf` — portable 10-slide export.
- `CipherPool-Demo.mp4` — 1080p H.264/AAC narrated walkthrough with burned-in captions.
- `deck-content.md` — approved slide claims and evidence.
- `demo-script.md` — presenter narration and manual demo guide.
- `assets/live-dashboard.png` — production UI captured from the public Vercel deployment.
- `assets/prize-claim-desktop.png` — desktop QA capture of the private prize flow.
- `assets/prize-claim-mobile.png` — 390px mobile QA capture with no horizontal overflow.

## Reproduce the deck

The generators do not add runtime dependencies to the application. Use an isolated Python environment:

```bash
python3 -m venv /tmp/cipherpool-showcase-venv
/tmp/cipherpool-showcase-venv/bin/pip install python-pptx Pillow
/tmp/cipherpool-showcase-venv/bin/python scripts/generate-showcase-deck.py
libreoffice --headless --convert-to pdf --outdir docs/showcase/presentation \
  docs/showcase/presentation/CipherPool-Presentation.pptx
pdftoppm -png -r 144 docs/showcase/presentation/CipherPool-Presentation.pdf \
  docs/showcase/presentation/assets/slide
python3 scripts/generate-showcase-video.py
```

The video generator requires `espeak-ng`, `ffmpeg`, and `ffprobe`. It uses deterministic local text-to-speech and burns the narration into the frame as captions. No wallet provider or blockchain response is mocked.

## Live demo handoff

Open [cipherpool-beta.vercel.app](https://cipherpool-beta.vercel.app) on Sepolia. Connect the intended wallet, confirm the address shown in the header, and verify runtime assurance before signing. Do not claim a transaction succeeded until its receipt is confirmed. The deck’s transaction evidence is the completed active-deployment lifecycle documented in [`../SUBMISSION_OVERVIEW.md`](../SUBMISSION_OVERVIEW.md).
