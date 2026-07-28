# Learning Journal

This file is the distilled staging layer between raw evidence and promoted repository knowledge.
Store synthesized observations here when they are useful enough to keep, but not yet stable enough to promote into long-term rules or profiles.

## Entries

### 2026-07-16 — Halo console integration

- task: Wire the supplied Halo design system into the Vite/React application and refactor console-owned UI without changing landing/authentication visuals.
- evidence: Static import scans, computed browser styles on `/`, `/login`, and `/key-usage`, plus desktop/mobile console layout checks.
- evidence_ref: `src/cascade.css`; `src/styles.css`; `src/console/console.css`; `docs/superpowers/specs/2026-07-16-halo-console-design.md`
- learned_fact: The landing stylesheet already declares `base` and `components` cascade layers. Loading Halo after those layers without predeclaring order would give Halo higher layered priority and leak its reset into the landing page.
- impact: `src/cascade.css` must load before `landing.css`, predeclaring `halo` as the lowest layer, while `system.css` remains imported once from `src/styles.css`.
- confidence: High.
- promotion_target: `engineering-constraints.md`
- follow_up: Keep the layer-order regression check whenever global CSS entry files change.
