# Learning Journal

This file is the distilled staging layer between raw evidence and promoted repository knowledge.
Store synthesized observations here when they are useful enough to keep, but not yet stable enough to promote into long-term rules or profiles.

## Entries

### 2026-07-16 — Halo console integration

- status: Superseded by the Appica production-component and legacy-style audit on 2026-08-14; retained as implementation history only.

- task: Wire the supplied Halo design system into the Vite/React application and refactor console-owned UI without changing landing/authentication visuals.
- evidence: Static import scans, computed browser styles on `/`, `/login`, and `/key-usage`, plus desktop/mobile console layout checks.
- evidence_ref: `src/cascade.css`; `src/styles.css`; `src/console/console.css`; `docs/superpowers/specs/2026-07-16-halo-console-design.md`
- learned_fact: The landing stylesheet already declares `base` and `components` cascade layers. Loading Halo after those layers without predeclaring order would give Halo higher layered priority and leak its reset into the landing page.
- impact: `src/cascade.css` must load before `landing.css`, predeclaring `halo` as the lowest layer, while `system.css` remains imported once from `src/styles.css`.
- confidence: High.
- promotion_target: `engineering-constraints.md`
- follow_up: Keep the layer-order regression check whenever global CSS entry files change.

### 2026-08-14 — Appica production-component and legacy-style audit

- task: Consolidate the active application on Appica components, icons, fonts, and role tokens while removing obsolete style layers.
- evidence: Runtime route inspection, source/import scans, CSS parsing, and removal of unreferenced legacy sources.
- evidence_ref: `src/appica.css`; `src/console/appica.css`; `src/main.jsx`; `docs/agent-knowledge/engineering-constraints.md`
- learned_fact: Landing, authentication, and console routes can share one Appica/Tailwind global baseline without the former Halo cascade bridge.
- impact: Appica owns primitive visuals and interaction states; application CSS owns product layout, composition, and data visualization.
- confidence: High.
- promotion_target: `engineering-constraints.md`
- follow_up: Keep representative browser route checks when global component or style imports change.
