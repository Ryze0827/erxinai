# Appica-native console visual QA

## Scope

- Reference: `appica-reference.png`
- Rendered page: `appica-native-keys-desktop-02.png`
- Combined comparison: `appica-native-keys-comparison.png`
- Viewport: 2048 × 1080 screenshot output (1862 × 982 CSS pixels at DPR 1.1)

The source is Appica's component landing page while the implementation is a data-dense console page, so the comparison evaluates shared visual language rather than identical page content.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: the API key table is necessarily denser than the source showcase. The implementation keeps Appica's neutral surfaces, low-contrast borders, compact controls, restrained radius scale, clear type hierarchy, and sparse semantic color while preserving ten-column operational data.

## Verified

- Runtime no longer loads `console.css`, `handoff-v1.css`, or `theme.css`.
- Desktop page has no document-level horizontal overflow.
- Narrow-screen page uses an off-canvas sidebar, full-width filter stack, and an internally scrollable table rather than overflowing the document.
- Endpoint, filter toolbar, table header, rows, and actions remain visually connected.
- Status is the only recurring semantic color in the key table; keys and group badges use neutral Appica roles.

## Result

Pass for the Appica-native visual-system migration. The remaining density difference is content-driven, not a spacing, border, typography, or color-system regression.
