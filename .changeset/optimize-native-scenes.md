---
"@ooopsstudio/scene-astro": patch
"@ooopsstudio/scene-core": patch
"@ooopsstudio/scene-gpu": patch
---

Keep large canvases inside quality-specific pixel budgets, adapt `auto` resolution from sustained
refresh-calibrated frame cadence, select GPU power preference by quality, make interaction-mode
updates idempotent, and preserve mode changes that arrive while an Astro scene is still mounting.
