# Halo Console Design

## Scope

Refactor the WayX user console to use the Halo design system. The landing page and every authentication-related route remain visually and structurally unchanged. Existing APIs, routing, permissions, payment behavior, localization, sidebar persistence, and user workflows remain unchanged.

Included surfaces are the authenticated console layout and its dashboard, API key, batch image, usage, channel, monitor, subscription, purchase, order, redeem, affiliate, profile, custom-page, and console-owned payment/key-usage surfaces.

## Stylesheet integration

- Declare the application layer order in `src/cascade.css`, load it before existing styles from `src/main.jsx`, and import `css/system.css` exactly once from `src/styles.css` using the low-priority `halo` layer.
- Keep existing landing and authentication styles unlayered so they retain cascade priority over Halo's global reset and generic utility selectors.
- Reuse Halo custom properties for typography, spacing, radii, motion, focus, surface tiers, borders, and signal colors.
- Keep the existing `.console-*` component API to avoid coupling the visual refactor to business behavior.

## Theme architecture

- Preserve `light`, `dark`, and `system` preferences and the existing persisted theme behavior.
- In dark mode, map console tokens exactly to Halo: `#0A0B0F`, `#14151C`, `#1E2029`, `#2A2D38`, `#3A3D4A`, `#F2F4F8`, `#9AA0AE`, `#5C6170`, `#5B6BFF`, `#7886FF`, `#4A59E6`, `#2BE08C`, `#F5D547`, `#3DD7E5`, and `#FF3A5C`.
- In light mode, retain the existing WayX neutral/light-blue palette while using the same Halo anatomy, sizing, spacing, borders, and interaction states.
- `system` continues to resolve through the operating-system preference, including the resolved theme passed to embedded custom pages.

## Layout and components

- Match the product shell in `html/preview.html`: a 64px top bar, 244px desktop sidebar, compact navigation, 24px content gutters, 16px component gaps, and responsive single-column collapse.
- Use Halo's three-tier surface hierarchy and hairline borders. Flat cards do not receive decorative shadows; ambient shadows are reserved for popovers, drawers, and modals.
- Buttons use 32/40/48px-compatible sizing, 10px radius, solid primary actions, bordered secondary actions, transparent tertiary actions, and clear pressed/disabled/focus states.
- Inputs use a 40px surface field, 10px radius, uppercase label anatomy, primary focus border, and 3px focus ring.
- Panels and data cards use 16px radius and 20–24px spacing. Stat cards use the Halo 2px signal hairline and monospaced metrics.
- Tabs use the pill container anatomy with a bordered active tab. Status colors always retain an icon, dot, or text label.
- Tables use dense monospaced numeric cells, uppercase headers, stable row separators, hover/focus states, and existing mobile card behavior.
- Existing icon paths remain centralized in `Icon.jsx`; no new custom paths or icon libraries are introduced. The shared stroke is standardized to 1.75px.

## Responsive and accessibility behavior

- Preserve the collapsed desktop icon rail and mobile drawer behavior.
- At narrow widths, page actions wrap, grids collapse, tables retain their existing mobile representation, and touch targets remain at least 40px where practical.
- Focus-visible states use the Halo focus ring. Reduced-motion behavior continues to disable nonessential transitions.
- Existing modal focus trapping, Escape handling, aria labels, table semantics, and status text remain unchanged.

## Verification

Repository rules prohibit unrequested tests and compilation. Verification consists of:

- confirming `system.css` is imported once;
- static scans for accidental landing/auth edits and unresolved CSS selectors;
- loading representative console routes in a real browser at desktop and mobile widths;
- checking light, dark, and system theme switching;
- checking navigation, sidebar collapse, cards, forms, tables, popovers, and modal surfaces;
- checking that `/`, `/login`, `/register`, password, email verification, and OAuth routes retain their previous styling.

## Existing-system conflicts

Halo is dark-only while the existing console promises light/dark/system. The approved resolution keeps the theme functionality, makes dark mode exact Halo, and treats light mode as a palette compatibility layer over Halo anatomy. Halo specifies Lucide; the project already has one centralized Lucide-compatible outline registry, so the refactor preserves it and standardizes its stroke instead of adding a conflicting second library.
