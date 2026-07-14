# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable prototype decisions

- Authentication success returns to the homepage instead of a standalone success screen.
- The authenticated homepage navigation shows the user's initial and a Dashboard entry; regular users go to `/dashboard`, while administrators go to `/admin/dashboard`.
- Turnstile verification fills the available authentication form width and remains responsive on narrow screens.
- The homepage `Start building` action uses the same Dashboard destination when the user is authenticated and otherwise opens registration.
- The Hero keeps the `Text / Code / Image / Reasoning` capability pills above the original overlapping AI tool icon strip.
- OAuth provider buttons follow the `sub2api` interaction: a single provider fills the row with a 48px branded button and `Sign in with …` label.
- Password visibility uses the `sub2api` eye/eye-off icon button instead of `Show/Hide` text.
