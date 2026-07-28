# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable prototype decisions

- Authentication, registration, email verification, and OAuth success open the API Keys route at `/keys`.
- The authenticated homepage navigation shows the user's initial and a Dashboard entry; regular users go to `/dashboard`, while administrators go to `/admin/dashboard`.
- The authenticated homepage pricing card keeps its copy in English, uses `Start using` with the `/keys` destination, replaces account-creation guidance with an API-key-ready message, and hides the login prompt; dedicated homepage internationalization is deferred.
- Turnstile verification fills the available authentication form width and remains responsive on narrow screens.
- The homepage `Start building` action opens `/keys` when the user is authenticated and otherwise opens registration.
- The Hero keeps the `Text / Code / Image / Reasoning` capability pills above the original overlapping AI tool icon strip.
- Homepage feature cards share their heading track height within each desktop row so paired demo panels remain horizontally aligned when descriptions wrap differently.
- OAuth provider buttons follow the `sub2api` interaction: a single provider fills the row with a 48px branded button and `Sign in with …` label.
- Password visibility uses the `sub2api` eye/eye-off icon button instead of `Show/Hide` text.
- The user console covers the complete non-admin `sub2api` feature set while keeping Sentence AI's light fluted-glass visual language; no administrator APIs or administrator navigation are included.
- New console, payment helper, and public key-usage surfaces are bilingual, default to English, persist the selected language, and send it through `Accept-Language`.
- `/admin/dashboard` remains a compatibility alias for the user dashboard; it does not expose administrator functionality.
- Console pages use the available desktop workspace more fully instead of centering content in a narrow admin column.
- The desktop console sidebar can collapse to an icon rail, persists the user's choice, and remains a drawer on mobile.
- Payment selectors retain recognizable provider branding and the backend-provided payment method display name.
- The API Keys page shows the configured default and custom API endpoints with copy actions and uses the default endpoint in quick-start examples.
- Group badges retain the group name while using platform-specific colors and recognizable platform marks, following `sub2api` semantics.
- Administrator contact details are not persistent in the sidebar; they appear in the top-right user dropdown, following `sub2api` interaction hierarchy.
- API Keys and Usage preserve the complete `sub2api` user-facing component hierarchy, dense table layout, column controls, filters, charts, dialogs, platform configuration, and mobile card behavior while using Sentence AI styling.
- User-console visuals are original to Sentence AI: calm solid-color surfaces, restrained gradients, clear component borders, compact corner radii, and strong contrast for icons, figures, units, and typography.
- Every user-console surface supports persisted light, dark, and system themes; custom embedded pages receive the resolved theme.
- The task-management smoke-glass visual system is scoped to user-console surfaces; the public homepage and authentication/register flows keep their original Sentence AI design. Both console light and dark themes use glass surfaces, metallic borders, theme-appropriate specular highlights, compact radii, and fluorescent green primary actions and status accents.
- The user console defaults to the light theme when no theme preference has been saved.
- The light console keeps the homepage fluted landscape as its visible glass substrate; the dark console uses a dimmed monochrome treatment of the same scene so backdrop blur remains visually legible.
- Desktop console core content spans the available workspace with compact 12px side gutters and a 20px bottom gutter; the top spacing remains unchanged, and the API Keys primary panel stretches to that lower boundary.
- Console glass keeps live backdrop blur on top-level surfaces only; nested controls use translucent fills and specular gradients to prevent scroll-time compositor stalls and blank-panel artifacts.
- Loading skeletons must reuse the final component's grid, dimensions, padding, and internal anatomy so asynchronous data never causes layout expansion or content jumps.
- User-console typography follows the `sub2api` system font stacks: native UI sans for Chinese, Latin, and ordinary numeric content, and the native UI monospace stack for code, endpoints, keys, and explicitly monospaced data.
- Date-range popovers use a substantially more opaque glass fill than the underlying panels so presets, fields, and actions remain legible over the landscape substrate.
- Masked API key capsules use translucent warm-yellow glass instead of black, including their nested copy controls.
- Console table row hover and selection highlights use one compositor-moved overlay per table so they follow the pointer immediately; avoid repainting full rows or adding background transitions.
- Primary console actions such as `New key` keep their solid fluorescent-green default fill in every theme; generic glass button styling must not override them.
- Selected API-group platform colors fill the entire group-select trigger, including the chevron area; the nested badge must not remain a smaller isolated color pill.
- API-group search inputs keep the filled-state height before and after typing; group options omit peak multipliers and align the effective multiplier at the far right.
- Desktop sidebar collapse and expansion retain a smooth slide while avoiding per-frame layout: animate the workspace with a compositor transform and the fixed-width sidebar shell with clipping, never with sidebar width or workspace offsets. Keep transform animation for the mobile drawer.
- On wide desktop API-key tables, give the name column a comfortable left inset and use the spare space before the actions column to shift concurrency, usage, expiry, status, and creation-time content right as one visual group, keeping the creation-time-to-actions gap compact.
- Discounted API-group badges show the original multiplier struck through beside the emphasized effective multiplier in the same compact rate capsule; non-discounted badges show only the effective multiplier.
- The API Keys content area omits its duplicate page title because the console header already names the route; keep only the explanatory subtitle above the keys panel.
- Persist only public brand fields and restore them before React starts so custom sidebar logos, site names, and favicons never flash the built-in Sentence AI brand during refresh; if no cached brand exists, keep the brand surface blank until public settings resolve.
- Dashboard balance figures use the theme success green; the spend summary is explicitly today's actual cost with today's standard cost as its comparison.
- Announcement bodies preserve both real and escaped line breaks in list previews and detail dialogs.
- The API endpoint capsule is a prominent toolbar element with readable endpoint text and full-size copy and latency-test controls.
- Every console route uses the sticky header as its single visible page title; omit duplicate content-level large headings while retaining subtitles and page actions in a compact intro row.
- The desktop Purchase route follows a single reference-led checkout flow: recharge/subscription tabs, available balance, 4×2 USD credit presets, custom USD credit input, vertically stacked real payment methods, security note, and one full-width confirmation action. Do not show discounts, bonus percentages, or CNY conversions outside the confirmation button; only that button shows the final payable RMB amount.
- The desktop Purchase flow is horizontally centered within the console workspace. Its balance overview follows the reference hierarchy with a wallet mark, current balance and account on the left, plus real cumulative recharge, cumulative consumption, and latest-recharge data from existing order and usage APIs; unavailable values use a visible dash instead of being omitted or fabricated.
- USD balance surfaces use the narrow `$` symbol and exactly two decimal places on the Purchase overview and persistent console-header balance; other monetary surfaces follow the global two-decimal display rule.
- The Purchase custom-amount field uses only its green glass-container focus state; suppress the nested global purple/blue input focus ring.
- The Purchase balance overview includes the reference's decorative stacked smoke-glass wallet asset at the far right. Dark mode keeps its emerald glow; light mode uses a quieter translucent treatment so the balance and statistics retain contrast.
- Channel Status follows the operational-board hierarchy of the approved reference: one full-width time/status filter bar, a five-metric health overview, and vertically stacked full-width channel cards with status-tinted rails, borders, metrics, timelines, and detail actions. Light mode uses the landscape-backed white glass system; dark mode uses the same structure in smoke-black glass.
- Channel Status timeline bars encode health directly through both height and color: healthy is the tallest green state, warning is the medium orange state, and incident is the shortest red state. Latency must not invert this visual hierarchy.
- Channel Status timeline endpoint labels stay anchored to the rendered bar group rather than stretching across unused grid space.
- Every USD money surface uses the narrow `$` symbol in every locale; never allow locale formatting to expand it to `US$`.
- User-facing Token usage values use `M` as the consistent million-token unit; dashboard and shared token-usage line charts label their scale as `Token (M)`.
- User-facing monetary balances and costs always show exactly two decimal places. The dashboard throughput card uses an integer RPM as its large primary value and a smaller purple TPM value with the `M` suffix at the bottom right.
- The dashboard places a reusable preset/custom time-range picker immediately before Refresh, and range changes reload its trend, model distribution, and recent usage data.
- The redemption page uses a full-width account summary, dual-theme wallet and gift artwork, paired redemption/about cards, and a recent-activity panel matching the reference hierarchy.
- User order status filtering follows the concise sub2api set (pending, completed, failed, refunded), uses localized labels, and remains compact rather than stretching across the toolbar.
- Profile avatar/status, login-method actions, and balance-notification controls use page-scoped layout classes so generic direct-child styling cannot distort badges or buttons.
- The announcement popover closes automatically when the user clicks outside its trigger and content, while interactions inside the popover keep it open.
- The persisted glass-transparency slider lives at the bottom-left of the expanded console sidebar, immediately above the homepage and collapse actions; higher percentages reveal more of the backdrop, and the control stays hidden in the collapsed desktop rail.
