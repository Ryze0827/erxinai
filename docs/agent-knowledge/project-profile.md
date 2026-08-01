# Project Profile

## Basic Information

- Project name: WayX Gateway Website Prototype
- Repository path: repository root (`.`)
- Primary purpose: Public AI-gateway website, production-oriented authentication client, and user console compatible with a `sub2api` backend.
- Owning team: Not documented.

## Technology Stack

- Languages and runtime: JavaScript, JSX, CSS; Node.js 20 or later is recommended.
- Build tool: Vite 6.
- Core frameworks: React 19 and React Router 7.
- Key middleware or platform dependencies: React Markdown, Stripe, Airwallex, QRCode, and a compatible `/api/v1` backend.

## Delivery And Runtime Shape

- Packaging model: Vite single-page application.
- Deployment model: Static frontend suitable for Cloudflare Pages, with same-origin backend APIs in production.
- Runtime environments: Browser client; Vite development server proxies `/api` and `/v1` during local development.
- Configuration sources: `import.meta.env`, `.env.local`, backend public settings, and persisted browser preferences.

## Module Responsibilities

- Module or directory: `src/console/`
  - Responsibility: Authenticated user console, shared console components, theming, localization, and console-owned public/payment surfaces.
  - Key entry points: `ConsoleLayout.jsx`, `UI.jsx`, `console.css`, `theme.js`, and `pages/`.
- Module or directory: `src/auth/`
  - Responsibility: Authentication, verification, recovery, OAuth, and session flows.
  - Key entry points: `AuthLayout.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, and `SessionManager.jsx`.
- Module or directory: `src/landing-page.html` and landing styles
  - Responsibility: Public marketing surface and interactive gateway demonstrations.
  - Key entry points: `App.jsx`, `landing-page.html`, `landing.css`, and `styles.css`.

## Key Code Paths

- Feature entry points: Route declarations in `src/App.jsx`.
- Primary business flow: Public landing/authentication routes lead into protected console routes backed by `src/api/`.
- Common extension points: Console page modules, shared primitives in `UI.jsx`, navigation definitions in `ConsoleLayout.jsx`, and CSS tokens in `console.css`.

## Maintenance Notes

- Frequently changed areas: Console pages and shared console styling.
- High-risk areas: Authentication redirects/session refresh, payment provider handoffs, route feature gating, and global CSS cascade order.
- Known dependency boundaries: Landing/authentication keep independent visual systems; console CSS uses prefixed `.console-*` selectors and the shared Halo token source.

## Captured Facts

- learned_fact: The application preserves three console theme preferences while using Halo as the exact dark palette and component anatomy baseline.
- evidence: `src/console/theme.js` and the Halo token bridge in `src/console/console.css`.
- evidence_ref: `DESIGN.md`; `src/console/console.css`
- impact: New console components should consume the existing `--console-*` bridge instead of introducing independent colors or geometry.
- confidence: High.
- source_task: Halo console design-system integration (2026-07-16).
- follow_up: Keep browser QA for light, dark, system, desktop, and mobile when console primitives change.
