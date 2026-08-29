# Engineering Constraints

## Hard Constraints

- Constraint: Load Tailwind CSS v4 and Appica's stylesheet exactly once through `src/appica.css`.
  - Evidence: `AGENTS.md`, `src/appica.css`, and `src/main.jsx`.
  - Impact: Duplicate framework imports or a second global style entry can change component precedence and reintroduce visual overrides.
- Constraint: Keep `@source "../node_modules/@appica/ui-react/dist"` relative to `src/appica.css`.
  - Evidence: `AGENTS.md` and `src/appica.css`.
  - Impact: Removing or mis-resolving this source causes Appica component classes to be omitted silently.
- Constraint: Use Appica components, icons, and semantic role tokens before product-owned implementations.
  - Evidence: `AGENTS.md`, `src/auth/AppicaAuth.jsx`, `src/console/UI.jsx`, and `src/console/Icon.jsx`.
  - Impact: Product CSS should focus on layout, data visualization, and application-specific composition instead of restyling Appica primitives.
- Constraint: Preserve light, dark, and system console theme preferences through Appica's role tokens.
  - Evidence: `src/appica.css`, `src/console/appica.css`, and `src/console/theme.js`.
  - Impact: New surfaces must use semantic tokens and remain legible in every resolved theme.

## Prohibited Changes

- Prohibited action: Add another global reset, legacy design-system stylesheet, or broad selector that restyles Appica primitives.
  - Reason: Appica is the single component and token baseline for landing, authentication, and console routes.
  - Evidence: `src/main.jsx`, `src/appica.css`, and the Appica production-component audit completed on 2026-08-14.
- Prohibited action: Hand-roll a control or icon that Appica already provides.
  - Reason: Native components preserve accessibility, interaction states, and theme behavior consistently.
  - Evidence: `AGENTS.md` and the component imports under `src/`.

## Project Exceptions

- Exception: Product-specific layout, charts, status-history graphics, and visually hidden semantic tables remain application-owned.
  - Applicable scope: Console composition and data visualization only.
  - Evidence: `src/console/appica.css` and `src/console/pages/MonitorPage.jsx`.
- Exception: Native file inputs may remain visually hidden when an Appica button provides the visible trigger.
  - Applicable scope: Avatar and image upload flows.
  - Evidence: `src/console/pages/ProfilePage.jsx` and `src/console/pages/ImageStudioPage.jsx`.

## Verification Requirements

- Required checks: Confirm one Appica/Tailwind global entry, resolvable imports, valid CSS, no legacy stylesheet references, and clean static diffs.
- Pre-release verification: Browser-check representative landing, authentication, and console routes in light, dark, and system preferences at desktop and mobile widths.
- Special regression scope: `/`, authentication routes, sidebar collapse/drawer behavior, dense tables, menus/dialogs, redemption, monitoring, payment, and image-generation surfaces.

## Captured Constraints

- constraint: Flat cards and panels use semantic surfaces and borders; ambient shadows are reserved for floating surfaces.
- evidence: Appica role tokens and the implemented panel/popover/modal mapping.
- evidence_ref: `src/appica.css`; `src/console/appica.css`
- impact: Avoid gradients and decorative shadows on new flat console components.
- confidence: High.
- source_task: Appica production-component and legacy-style audit (2026-08-14).
- follow_up: Review new primitives against Appica documentation and representative browser routes.
