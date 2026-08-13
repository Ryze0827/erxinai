# WayX mark generation notes

Final assets:

- `wayx-mark.png` — transparent cropped master, 957 × 957.
- `wayx-mark-512.png` — UI/high-density export.
- `wayx-mark-128.png` — common application mark.
- `wayx-mark-64.png` — small UI/favicon source.

Reference: `global-wayx-brand-lockup-reference-dark-v1.png`, top-left mark only.

Method: OpenAI built-in image generation created a high-resolution mark on a flat chroma-key background. The bundled chroma removal helper produced the alpha PNG, after which the transparent bounds were cropped, centered and resized. The unkeyed source is retained at `../../reference/source/wayx-mark-chroma-source.png` for provenance.

Final prompt:

```text
Use case: logo-brand
Asset type: standalone WayX application brand mark for UI headers and favicons
Primary request: Recreate only the small crossed-X WayX symbol shown at the top-left of the reference image. Do not include the "WayX" wordmark or any other screenshot content.
Input image: the provided screenshot is the exact geometry and color reference; the target is the crossed-X mark immediately left of the WayX wordmark.
Subject: one symmetrical X-shaped mark made from four softly rounded capsule/petal arms crossing in the center, with the same indigo, violet, blue, and pale-lavender gradient treatment as the reference.
Style/medium: polished vector-friendly app logo rendered as a clean high-resolution raster; crisp antialiased edges; restrained soft internal gradient; no shadow beyond the mark itself.
Composition/framing: square canvas, mark centered, generous and even padding, straight-on, fully visible.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for later background removal.
Constraints: preserve the reference mark's proportions, rounded ends, overlap order, color distribution, and center crossing; background must be one uniform #00ff00 with no gradient, texture, reflection, floor, or lighting variation; keep the mark fully separated from the canvas edges.
Avoid: text, letters, wordmark, border, badge container, mockup, screenshot UI, shadow on background, watermark, extra shapes, #00ff00 anywhere inside the mark.
```

