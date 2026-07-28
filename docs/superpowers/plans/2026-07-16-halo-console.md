# Halo Console Implementation Plan

> **For agentic workers:** Execute inline in the current workspace. The repository explicitly prohibits unrequested unit tests and compilation, so verification uses static inspection and browser QA.

**Goal:** Refactor all console-owned surfaces to Halo component anatomy while preserving the existing light/dark/system theme behavior and leaving landing/authentication pages unchanged.

**Architecture:** Import the supplied design-system CSS once in a low-priority cascade layer, then bridge the existing prefixed console components to Halo tokens in the console stylesheet. Preserve React component contracts and business behavior; only the centralized icon stroke changes in JSX.

**Tech Stack:** Vite 6, React 19, React Router 7, plain CSS custom properties.

## Global Constraints

- Do not modify the landing page or authentication-related page markup/styles.
- Do not change API, route, permission, payment, localization, or persistence behavior.
- Preserve light/dark/system; dark is exact Halo, light keeps existing color character with Halo anatomy.
- Do not add a second icon library or new custom icon paths.
- Do not run unit tests or compilation unless the user asks.
- Keep method complexity below 10 and avoid unnecessary validation.

---

### Task 1: Wire the design system once

**Files:**
- Create: `src/cascade.css`
- Modify: `src/main.jsx`
- Modify: `src/styles.css`
- Reference: `css/system.css`

**Interfaces:**
- Consumes: Halo's `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, typography, focus, and motion tokens.
- Produces: one application-level Halo import available to console CSS without overriding unlayered landing/auth styles.

- [ ] Declare `@layer halo, base, components;` in `src/cascade.css` and import it before `landing.css` from `src/main.jsx` so Halo remains lower priority than the existing landing layers.
- [ ] Add `@import url("../css/system.css") layer(halo);` before every other rule in `src/styles.css`.
- [ ] Confirm `rg -n "system\\.css" src css index.html` reports one import site plus the source file path only where expected.

### Task 2: Map themes and shell anatomy

**Files:**
- Modify: `src/console/console.css`

**Interfaces:**
- Consumes: Halo tokens from Task 1 and the existing `data-console-theme` attribute.
- Produces: stable `--console-*` variables consumed by all existing `.console-*` selectors.

- [ ] Replace dark console values with the exact Halo palette and use system radius, focus, motion, and shadow tokens.
- [ ] Retain the current light palette while aligning radii, spacing, controls, and surface hierarchy with Halo.
- [ ] Align sidebar, header, workspace gutters, page headings, panels, popovers, and modal elevation with `html/preview.html`.
- [ ] Preserve desktop sidebar collapse and mobile drawer media queries.

### Task 3: Align reusable components and data surfaces

**Files:**
- Modify: `src/console/console.css`
- Modify: `src/console/Icon.jsx`

**Interfaces:**
- Consumes: existing `Page`, `Panel`, `Button`, `Field`, `TextInput`, `SelectInput`, `Toggle`, `StatusBadge`, `DataTable`, `StatCard`, `Modal`, and chart markup.
- Produces: Halo anatomy without changing component props or call sites.

- [ ] Apply 10px control radii, 40px default heights, Halo focus rings, pressed states, and disabled states.
- [ ] Apply 16px panel/stat radii, hairline borders, 20–24px internal spacing, and restrained elevation.
- [ ] Give stat cards a 2px signal hairline and monospaced metrics; align status badges, chips, tabs, tables, charts, code, and numeric content.
- [ ] Preserve recognizable provider/platform colors while using Halo border and surface rules.
- [ ] Change the centralized SVG stroke width from `2` to `1.75` without altering paths or component behavior.

### Task 4: Static and browser verification

**Files:**
- Inspect: `src/styles.css`
- Inspect: `src/console/console.css`
- Inspect: `src/console/Icon.jsx`
- Inspect: `src/landing.css`
- Inspect: `src/auth.css`

**Interfaces:**
- Consumes: the completed stylesheet and existing Vite development server.
- Produces: evidence that the scoped refactor matches the design and respects excluded routes.

- [ ] Run CSS brace/import/static scans without invoking tests or a build.
- [ ] Review `git diff` and confirm no landing/auth source files changed.
- [ ] Start the existing Vite development server and inspect representative console routes at desktop and mobile widths.
- [ ] Cycle light, dark, and system themes and inspect shell, navigation, panels, forms, tables, popovers, and modal surfaces.
- [ ] Load the landing and authentication routes to confirm their previous visual systems remain intact.
