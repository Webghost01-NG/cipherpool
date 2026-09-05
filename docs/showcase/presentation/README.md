# Veylott Showcase Assets

This directory contains the editable deck, PDF export, captioned video, verified source copy, and production screenshots. Assets were refreshed against the active ERC-7984 deployment and canonical application on 5 September 2026. The video uses already-confirmed receipts and does not simulate wallet, KMS, or transaction success.

## Deliverables

- `Veylott-Presentation.pptx` — editable 16:9 PowerPoint deck.
- `Veylott-Presentation.pdf` — portable 10-slide export.
- `Veylott-Demo.mp4` — under-three-minute, 1080p H.264/AAC walkthrough with captions.
- `deck-content.md` — source claims and evidence links.
- `demo-script.md` — human presenter run-of-show and recording checklist.
- `assets/live-dashboard.png` — canonical production capture.
- `../../qa/evidence/live-{desktop,tablet,mobile}.png` — reproducible cross-device captures.

## Reproduce

The generators add no application dependency:

```bash
python3 -m venv /tmp/veylott-showcase-venv
/tmp/veylott-showcase-venv/bin/pip install python-pptx Pillow
/tmp/veylott-showcase-venv/bin/python scripts/generate-showcase-deck.py
libreoffice --headless --convert-to pdf --outdir docs/showcase/presentation \
  docs/showcase/presentation/Veylott-Presentation.pptx
pdftoppm -png -r 144 docs/showcase/presentation/Veylott-Presentation.pdf \
  docs/showcase/presentation/assets/slide
python3 scripts/generate-showcase-video.py
```

The video generator requires `espeak-ng`, `ffmpeg`, and `ffprobe`. Local text-to-speech and captions are deterministic.

## Live Demo Handoff

Open the [canonical Veylott app](https://veylott-git-feat-veylott-rebrand-webghost01-ngs-projects.vercel.app/) on Sepolia. Confirm the selected wallet and runtime assurance before signing. Never claim success before a confirmed receipt. The deck uses the completed active-pool evidence in the [submission overview](../SUBMISSION_OVERVIEW.md) and [lifecycle record](../../operations/live-prize-lifecycle.md#completed-active-deployment-three-wallet-lifecycle).
