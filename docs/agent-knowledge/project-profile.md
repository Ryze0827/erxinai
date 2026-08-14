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
  - Key entry points: `ConsoleLayout.jsx`, `UI.jsx`, `appica.css`, `theme.js`, and `pages/`.
- Module or directory: `src/auth/`
  - Responsibility: Authentication, verification, recovery, OAuth, and session flows.
  - Key entry points: `AppicaAuth.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, and `SessionManager.jsx`.
- Module or directory: `src/landing/`
  - Responsibility: Public Appica marketing surface.
  - Key entry points: `AppicaLandingPage.jsx` and `AppicaLandingPage.css`.

## Key Code Paths

- Feature entry points: Route declarations in `src/App.jsx`.
- Primary business flow: Public landing/authentication routes lead into protected console routes backed by `src/api/`.
- Common extension points: Console page modules, shared Appica primitives in `UI.jsx`, navigation definitions in `ConsoleLayout.jsx`, and layout styles in `appica.css`.

## Maintenance Notes

- Frequently changed areas: Console pages and shared console styling.
- High-risk areas: Authentication redirects/session refresh, payment provider handoffs, route feature gating, and global CSS cascade order.
- Known dependency boundaries: Landing, authentication, and console routes share Appica primitives and role tokens; console-specific CSS is limited to product layout and data visualization.

## Captured Facts

- learned_fact: The application preserves console theme preferences while using Appica as the component and role-token baseline.
- evidence: `src/appica.css`, `src/console/appica.css`, and `src/console/theme.js`.
- evidence_ref: `src/appica.css`; `src/console/appica.css`; `src/console/theme.js`
- impact: New controls should use Appica components first; custom CSS should remain limited to product layout or data visualization.
- confidence: High.
- source_task: Appica production-component and legacy-style audit (2026-08-14).
- follow_up: Keep browser QA for light, dark, system, desktop, and mobile when console primitives change.
