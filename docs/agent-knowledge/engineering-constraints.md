# Engineering Constraints

## Hard Constraints

- Constraint: Load `css/system.css` exactly once through `src/styles.css`; declare `halo, base, components` layer order before landing styles.
  - Evidence: `src/cascade.css`, `src/main.jsx`, and `src/styles.css`.
  - Impact: Changing import count or layer order can leak Halo's global reset and generic component selectors into the landing page.
- Constraint: Preserve the independent landing and authentication visual systems when changing console UI.
  - Evidence: `AGENTS.md` and the approved Halo console design.
  - Impact: Console styling must remain under `.console-*` roots or a lower-priority cascade layer.
- Constraint: Preserve light, dark, and system console theme preferences; dark maps exactly to Halo tokens.
  - Evidence: `AGENTS.md`, `DESIGN.md`, `src/console/theme.js`, and `src/console/console.css`.
  - Impact: New console surfaces need semantic token usage and must work in both resolved themes.

## Prohibited Changes

- Prohibited action: Add unscoped, unlayered design-system component rules that collide with landing or authentication selectors.
  - Reason: The application deliberately ships multiple independent visual systems.
  - Evidence: `src/cascade.css`, `src/landing.css`, `src/auth.css`, and `css/system.css`.

## Project Exceptions

- Exception: Light console mode retains the existing WayX palette instead of deriving a new Halo light palette.
  - Applicable scope: Console-owned surfaces only.
  - Evidence: Approved design decision in `docs/superpowers/specs/2026-07-16-halo-console-design.md`.

## Verification Requirements

- Required checks: Confirm one `system.css` import, no unintended landing/auth diffs, and clean CSS/static diffs.
- Pre-release verification: Browser-check representative console surfaces in light, dark, and system preferences at desktop and mobile widths.
- Special regression scope: `/`, all authentication routes, sidebar collapse/drawer behavior, dense tables, modals/popovers, and payment/key-usage surfaces.

## Captured Constraints

- constraint: Flat console cards and panels use tiered surfaces plus 1px borders; ambient shadows are reserved for floating surfaces.
- evidence: Halo elevation rules and the implemented panel/popover/modal mapping.
- evidence_ref: `DESIGN.md`; `src/console/console.css`
- impact: Avoid gradients and drop shadows on new flat console components.
- confidence: High.
- source_task: Halo console design-system integration (2026-07-16).
- follow_up: Review new primitives against `html/preview.html`.
