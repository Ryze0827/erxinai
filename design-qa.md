# Design QA — Black / white glass console

## Comparison target

- Source visual truth: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-a3999dd1-d934-4e2d-b817-fe7c2b34f468.png`
- Light implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/console-light-final.png`
- Dark implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/console-dark-final.png`
- Scroll-performance implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/console-light-scroll-performance-fixed.png`
- Focused material comparison: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/glass-material-comparison-final.jpg`
- State: authenticated desktop dashboard with representative local fixture data
- Viewport: 1440 × 1000 CSS px
- Source pixels: 205 × 216
- Implementation pixels: 1440 × 1000 at 1× density
- Focus crops: 173 × 174, contained at up to 205 × 216 in the combined comparison

## Full-view comparison evidence

- Light mode retains the homepage fluted landscape as the visible substrate. Top-level glass surfaces refract that image through low-opacity white-green fills, 20px blur, saturation, white specular edges, and a restrained shadow. Nested elements retain the same material anatomy through translucent fills and highlights without stacking additional blur filters. Text remains dark enough to read over both the blue sky and green field.
- Dark mode uses the same scene as a dimmed monochrome substrate. Smoke-grey panels, silver hairlines, upper-right glare, inset highlights, and softened background transmission reproduce the reference material without copying its content layout.
- The 1440px dashboard has no horizontal overflow. All six metric cards, header controls, sidebar, charts, and quick actions remain within the viewport.

## Focused region comparison evidence

The combined reference/dark/light card comparison verifies the material at readable scale. The final dark metric card matches the reference's compact radius, smoky charcoal translucency, bright perimeter, pale top/right reflection, light foreground typography, and visible-but-softened substrate. The light variant preserves the same material anatomy while using a translucent white fill and dark foreground for contrast.

## Required fidelity surfaces

- Fonts and typography: console interface copy, headings, and ordinary figures follow the same native UI sans stack as `sub2api`; code-like content follows its native UI monospace stack. Metric weight, large-number hierarchy, compact labels, line height, and tabular figures remain legible in both themes.
- Spacing and layout rhythm: existing console information architecture is preserved. Glass cards use compact 18px radii and consistent 14–24px gaps; no desktop overflow or unintended wrapping was observed.
- Colors and visual tokens: both themes now share explicit glass highlight, shade, blur, saturation, border, and elevation tokens. Fluorescent green remains the action/status accent.
- Image quality and asset fidelity: the existing full-resolution homepage scene is reused directly; no placeholder or recreated background asset is present. The background remains sharp outside surfaces and is optically softened beneath glass.
- Copy and content: dashboard labels, navigation, values, and hierarchy are unchanged.

## Comparison history

1. Initial P2: dark surfaces were too opaque and flat, while a near-solid canvas left too little information for backdrop blur to refract.
   - Fix: lowered surface opacity, restored the scene beneath the dark theme, added 32–34px backdrop blur, saturation, metallic borders, inset highlights, and layered specular glare.
   - Evidence: `console-dark-v1.png` and `glass-material-comparison-v1.jpg`.
2. Second P2: the first dark pass was still darker and less reflective than the supplied card reference.
   - Fix: increased smoke-glass body density, silver edge contrast, scene visibility, and white highlight strength.
   - Post-fix evidence: `console-dark-final.png` and `glass-material-comparison-final.jpg`.
3. Runtime P1: opening and immediately scrolling a high-density dashboard could temporarily show empty translucent rectangles and feel unresponsive.
   - Cause: 39 simultaneous backdrop-filter layers were composited over a fixed image with a viewport-wide CSS filter.
   - Fix: removed the full-screen filter and fixed background attachment, kept 18–20px live blur on the nine top-level surfaces, and rendered nested materials with fills, borders, gradients, and highlights.
   - Post-fix evidence: `console-light-scroll-performance-fixed.png`.

## Interaction and runtime checks

- Theme control: light → dark → system → light.
- Sidebar: collapse and expand both update the layout correctly.
- Browser console: no errors on the final dashboard.
- Horizontal layout: `scrollWidth` equals the 1440px viewport width.
- Scroll stress: repeated down/up/down scrolling preserved panel content and geometry in light and dark themes.
- Compositing: active backdrop-filter layers reduced from 39 to 9; screenshot capture fell from about 88 seconds before the fix to 0.04–0.16 seconds after it in the same browser session.
- Mobile was intentionally not evaluated for this pass, per request.
- No unit test or production build was run.

## Usage summary skeleton QA

- Source visual truth: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-9232d539-0838-425e-9a0e-2d48b28389cd.png`
- Reported incorrect state: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-6a2a02c6-3a72-4561-a731-1c49309754c4.png`
- Loading implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/usage-stats-loading-fixed.png`
- Loaded implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/usage-stats-loaded.png`
- Focused comparison: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/usage-stats-reference-vs-loading.jpg`
- Source pixels: 2560 × 1352. Implementation viewport: 1217 × 1232 CSS px at 1× density. The focused card rows were normalized to 885 × 148 for structural comparison.
- State: authenticated desktop Usage page, light theme, with a controlled 1.8-second API delay for the loading capture.
- Full-view evidence: loading and loaded states both render four equal 210.75px columns across the 885px content width. Every card remains 148px high at the same x/y coordinates, with no horizontal overflow or layout expansion.
- Focused evidence: the combined comparison shows the skeleton preserving the final card's label, main value, supporting text, and top-right circular icon zones. Typography is represented by neutral bars during loading; spacing, radius, glass tokens, background image quality, and card hierarchy remain consistent. App copy is unchanged once data resolves.
- Comparison history: P1 grid mismatch caused the four loading cards to inherit the six-column theme grid and occupy only part of the available row; blank skeleton bodies also failed to communicate final content placement. The fix reuses the loaded Usage grid class, restores the four-column modifier after theme overrides, and introduces a shared statistic-card skeleton matching the final anatomy. Post-fix browser evidence confirms identical loading/loaded geometry. The Affiliate four-card grid was also checked and now fills the same 885px width.

## Findings

- No actionable P0, P1, or P2 differences remain in the requested desktop glass-material scope.
- P3 follow-up: additional pages can receive route-specific screenshot tuning if their real production data creates unusually dense tables or dialogs.

## `sub2api` typography QA

- Selected direction: match `/Users/liwei/WebstormProjects/sub2api/frontend/tailwind.config.js` — native UI sans for Simplified Chinese, Latin, and ordinary numeric content; native UI monospace for code, endpoints, keys, and explicitly monospaced values.
- Final implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/console-sub2api-fonts-usage-final.png`
- State: authenticated desktop Usage page, light theme, Chinese locale, 1217 × 1232 CSS px.
- Source: the `sub2api` Tailwind `fontFamily.sans` and `fontFamily.mono` declarations. No remote font stylesheet or additional font payload is required.
- Browser evidence: the console root, page heading, statistic figures, panels, and table cells resolve to the `sub2api` native UI sans stack; table code cells resolve to its native UI monospace stack. No browser errors were logged.
- Layout evidence: the typography change preserves the four-column statistic row and two-column panel grid. The 1217px viewport remains free of horizontal overflow (`scrollWidth = innerWidth = 1217`).
- Scope: public landing and authentication typography remains unchanged, matching the existing decision to keep the console visual system isolated.

## Date popover and API-key capsule QA

- Reported date-popover state: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-06adf57b-fffb-4fc4-8a92-8b18a1d202e2.png`
- Reported API-key capsule state: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-0d4d0922-cb0a-49c1-a416-6f233d8353dd.png`
- Final date-popover implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/date-range-popover-contrast-final.png`
- Date popover: the light surface now uses a 98.5% opaque warm glass base, 94% opaque input surfaces, higher-contrast borders, and a restored solid primary action. Its containing panel is elevated above later backdrop-filter panels so the calendar can no longer be composited behind the chart grid.
- API-key capsules: table keys now use translucent pale-yellow glass with dark warm text and a matching translucent copy control in light mode. Dark mode uses a subdued amber-smoke equivalent instead of the previous black block.
- Browser evidence: every preset, label, date value, calendar icon, and action is visible in the open popover. The 1217px desktop viewport remains free of horizontal overflow, and the browser logged no errors or warnings.

## API Keys desktop workspace density QA

- Reported layout: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-3fc488b0-6c23-4b7c-a5a4-5d4e30a5dc4f.png`
- Final implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/keys-core-layout-expanded-final.png`
- Scope: desktop API Keys core content only; the header, sidebar, and existing top offset remain unchanged.
- Before: the shared desktop main container used 24px side padding, 42px bottom padding, and a 1720px maximum width that introduced additional centering space on wider displays.
- After: the shared desktop content uses the full workspace width with 12px side padding and 20px bottom padding. The API Keys page has a viewport-relative minimum height and its primary panel flexes to the lower boundary.
- Browser evidence at 1217 × 1232 CSS px: left gutter 12px, right gutter 12px, bottom gutter 20px; computed maximum width is `none`, and the primary panel ends exactly at the requested lower gutter.
- Mobile rules were left unchanged.

## Channel Status operational-board QA

- Source visual truth: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-b8d383d8-d651-48b7-9f0f-ba510c92e237.png`
- Light implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/monitor-light-final.png`
- Dark implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/monitor-dark-final.png`
- Full-view comparison: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/monitor-reference-vs-themes-final.png`
- Focused card comparison: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/monitor-card-detail-comparison-final.png`
- Viewport and density: source 1415 × 850 pixels; both implementations captured at 1415 × 850 CSS px with 1× density. The side-by-side comparison keeps every source and implementation frame at exactly 1415 × 850 pixels.
- State: authenticated Chinese desktop console, five representative channels, 7-day range, all-status filter, 30-second automatic refresh, detail dialog closed.
- Full-view evidence: the implementation preserves the current WayX sidebar and sticky console header while adopting the reference hierarchy inside the route content: title/subtitle, one full-width time/status/refresh toolbar, five evenly divided overview metrics, and vertically stacked full-width channel rows. Dark mode uses smoke-black glass and the dimmed monochrome landscape; light mode exposes the original landscape beneath higher-contrast white glass.
- Focused evidence: the status rail, provider/model header, last-check status, latency, ping, large availability value, multicolor uptime bars, axis labels, and detail button all remain visible at the same hierarchy as the reference. Green, amber, and red tones consistently connect each card's border, status icon, label, availability value, and timeline failures.
- Fonts and typography: the existing `sub2api` native UI stacks remain intact. Tabular figures use the same compact numeric hierarchy across both themes, with no clipping or unintended wrapping at the target viewport.
- Spacing and layout rhythm: toolbar height is 68px, overview height is 132px, and each channel card is 168px. The 1107px route content width has no document-level horizontal overflow; `scrollWidth` and `clientWidth` both equal 1415px.
- Colors and visual tokens: the page uses the established console glass, line, highlight, shadow, success, warning, and danger tokens. The reference's dark operational palette is reproduced in dark mode; light mode maps the same semantic colors onto landscape-backed translucent surfaces with readable dark foregrounds.
- Image quality and assets: the full-resolution existing landscape remains the only raster substrate. The source contains no custom illustrations or product imagery requiring generation; all UI symbols use the project's existing icon library.
- Copy and content: the page remains bilingual. The Chinese reference terminology is used for `正常`, `警告`, `异常`, `X 天前`, and `现在`, while route/model/provider values continue to come from API data.
- Primary interactions tested: 7/15/30/90-day controls, status filtering (`警告` reduced five rows to one), automatic-refresh interval selector, detail-dialog open/close, and restoration to the default 7-day/all-channel state. The 90-day control resolved the selected channel's 90-day availability.
- Browser console: no errors or warnings.
- Comparison history:
  1. Initial P1: the old implementation used two-column compact cards and scattered header actions, so it lacked the reference's operational hierarchy and scanability.
     - Fix: rebuilt the route around a unified toolbar, five-metric overview, and full-width status rows with status-linked borders and timelines.
  2. First visual pass P2: card statuses still used generic `降级/失败` labels and the timeline axis mixed English into the Chinese screen.
     - Fix: changed the monitor vocabulary to `警告/异常` and localized the timeline to `X 天前/现在`.
     - Post-fix evidence: `monitor-dark-final.png`, `monitor-light-final.png`, and the two side-by-side comparison files above.
- Remaining differences: the implementation intentionally retains the product's global sidebar, header, dynamic API values, and landscape substrate; these are established product constraints rather than reference drift. No actionable P0, P1, or P2 differences remain.

## Console page-title de-duplication QA

- Reported duplicate-title state: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-c34d9840-18fe-43e3-a53c-9596f6519ad1.png`
- Final implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/console-page-titles-removed-final.png`
- Scope: all routes rendered through the shared console `Page` component. The sticky console header is now the only visible page title; page subtitles and actions remain in a compact introduction row.
- Accessibility: each route keeps one semantic level-one heading in the document while visually clipping it, so the visual duplication is removed without discarding page structure for assistive technology.
- Browser coverage: Dashboard, API Keys, Batch Images, Usage, Redeem, Affiliate, Available Channels, Channel Status, Profile, Subscriptions, Purchase, and Orders were checked individually. Every route reported zero visible content-level `h1` elements.
- Layout evidence: compact introduction rows measure 23.25–40px depending on subtitle wrapping, all checked routes remain free of horizontal overflow, and no empty title-height spacer remains. The browser console logged no runtime errors.

## Purchase reference reconstruction QA

- Source visual truth: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-03355fef-ea8c-439f-a846-37b89ce52512.png`
- Light implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-reference-light-final.png`
- Dark implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-reference-dark-final.png`
- Native-pixel comparison inputs:
  - `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-reference-vs-dark-final.png`
  - `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-reference-vs-light-final.png`
- Viewport and normalization: the source is 1401 × 848 pixels. The implementation was rendered in the in-app desktop browser at 1280 × 720 CSS px and captured as a 1280 × 960 full-page image at 1× density so the payment method rows and confirmation action were not cropped. The comparison inputs retain source and implementation at native pixel density side by side without resampling. The retained WayX sidebar/header account for the viewport difference and are an established product constraint.
- State: authenticated Chinese console, `$10` selected, Alipay selected, payment multiplier `0.14`, no fee, light and dark themes, confirmation amount `¥71.43`.
- Full-view evidence: the implementation follows the reference hierarchy in the same order—recharge/subscription switcher, balance overview, 4×2 quick amounts, custom credit input, vertically stacked payment methods, encrypted-payment note, and one full-width confirmation action. The balance overview now includes cumulative recharge, cumulative consumption, and latest recharge following the subsequent reference-correction request.
- Focused evidence: a separate crop was unnecessary because the native-pixel comparison keeps the amount cards, custom input, provider marks, method descriptions, selected checks, security copy, and final button text legible. Both provider rows reuse the existing recognizable Alipay and WeChat assets rather than placeholders.
- Fonts and typography: the established `sub2api` native UI sans stack remains intact. Amount figures use compact semibold tabular typography; labels, helper text, and provider descriptions retain the reference hierarchy without clipping or unintended wrapping.
- Spacing and layout rhythm: desktop quick amounts form two exact rows of four 234 × 78px cards with 12px horizontal and vertical gaps. The checkout content is 972px wide in the verified viewport, selected/unselected radii and strokes follow the reference, and the document has no horizontal overflow.
- Colors and visual tokens: dark mode maps the reference to smoke-black glass, subdued metallic borders, fluorescent-green selection states, and a green confirmation bar with white text. Light mode preserves the homepage landscape under readable white glass while keeping the same semantic green hierarchy.
- Image quality and assets: the full-resolution existing landscape remains the only page substrate. The reference contains no additional required photography or illustrations; the payment provider marks and console icons come from the existing product asset system.
- Copy and content: discount badges, bonus percentages, card-level CNY estimates, and a separate order summary are intentionally absent. Quick cards and the custom field show only USD credit values; only the confirmation action shows the final payable RMB amount. The balance overview statistics are sourced from existing order and usage APIs and use a dash when a source is unavailable.
- Primary interactions tested:
  - `$200` selection updated the action to `确认支付 ¥1,428.57`.
  - Custom `$35` input cleared the preset state and updated the action to `确认支付 ¥250.00`.
  - Alipay and WeChat selection states switched correctly.
  - Recharge and subscription tabs both changed their content and restored the recharge grid.
- Browser evidence: latest-page reload reported zero new runtime errors, zero horizontal overflow, eight equal quick-amount cards, two available payment-method rows, and zero visible duplicate content headings.
- Comparison history:
  1. Initial P2: the dark-theme confirmation action inherited a dark foreground, while the reference uses white text and iconography on green.
     - Fix: scoped the Purchase confirmation action to a white foreground in both themes.
     - Post-fix evidence: `purchase-reference-vs-dark-final.png` and `purchase-reference-vs-light-final.png`.
- Remaining differences: the implementation intentionally retains the WayX global sidebar/header, real account balance, product background image, and data supplied by the payment and usage APIs. Discounts, bonuses, and intermediate CNY conversions remain excluded by request. No actionable P0, P1, or P2 differences remain.

## Purchase centering and balance-overview correction QA

- Follow-up evidence: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-3ae5f336-ff0c-4046-a1a3-35ecaa86c62d.png` and `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-724e027d-f08a-4d49-8159-df0a983621f2.png`.
- Source visual truth: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-03355fef-ea8c-439f-a846-37b89ce52512.png`.
- Final light implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-overview-centered-light-final.png`.
- Final dark implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-overview-centered-dark-final.png`.
- Side-by-side visual checks:
  - `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-overview-reference-vs-light-final.png`
  - `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-overview-reference-vs-dark-final.png`
- Centering: the Purchase page now uses automatic inline margins instead of the ineffective cross-axis alignment rule. At the 1280px desktop verification viewport, the page has exact 12px left and right workspace gutters with a 0px centering delta. With the sidebar collapsed, the page remains centered with the same 0px delta and expands from 972px to 1152px.
- Balance-overview anatomy: the 124px overview is split into a wallet/current-balance block and three equal 169.03px statistic columns. Vertical separators, tabular figures, a higher-fidelity wallet mark, account line, cumulative recharge, cumulative consumption, and latest recharge match the reference hierarchy.
- Data behavior: cumulative recharge aggregates successful balance orders across available pagination, cumulative consumption uses the existing all-time dashboard usage total, and latest recharge uses the newest completed/paid order timestamp. Failed sources render a visible dash; production values are never fabricated.
- Readability: the latest date uses the compact reference format `YYYY-MM-DD`, preventing the clipping seen with a localized long Chinese date. Light mode retains the landscape substrate and white glass; dark mode retains the monochrome smoke-glass mapping.
- Interaction and runtime checks: selecting `$200` updated the confirmation action to `确认支付 ¥1,428.57`, restoring `$10` returned it to `确认支付 ¥71.43`, the document has zero horizontal overflow, and the browser logged no errors or warnings.

## Purchase balance-format correction QA

- Requested correction: Purchase and persistent header balances must use `$` instead of `US$` and show exactly two decimal places.
- Light implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-balance-format-light-final.png`.
- Dark implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-balance-format-dark-final.png`.
- Reference comparison: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-balance-format-reference-vs-light-final.png`.
- Browser evidence: the Purchase balance and top-right header both render `$855.18`; cumulative recharge and consumption render `$1,843.45` and `$1,568.26`. Light and dark themes have zero horizontal overflow and no browser errors or warnings.
- Scope control: high-precision usage and billing-cost displays continue to use the existing four-decimal formatter, so the balance correction does not discard cost precision elsewhere.

## Purchase custom-amount focus correction QA

- Reported state: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-11b1dd06-0796-4298-b0a1-2f97c1f39687.png`.
- Final focused state: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/purchase-custom-amount-focus-final.png`.
- Cause: the console-wide `:focus-visible` rule added its purple/blue focus shadow directly to the nested number input, while the Purchase wrapper already supplied the intended green focus treatment.
- Correction: the nested input now suppresses only that global shadow and outline. The outer glass field keeps its green border and soft three-pixel focus halo for keyboard visibility.
- Browser evidence: focused input shadow is `none`, focused input outline is `none`, the wrapper border resolves to the theme accent in both light and dark themes, horizontal overflow is zero, and no browser errors or warnings were logged.

## Channel Status timeline hierarchy correction QA

- Reported state: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-fed9d501-ff27-45df-b9ba-7de7ade30777.png`.
- Final light implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/channel-status-bar-hierarchy-wide.png`.
- Final dark implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/channel-status-bar-hierarchy-dark-final.png`.
- Same-size visual comparison: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/channel-status-bar-reference-vs-final.png`.
- Semantic correction: timeline height is now determined by health state instead of latency. Healthy/green renders at 100%, warning/orange at 68%, incident/red at 38%, and unknown at 52%.
- Browser evidence in light mode: healthy bars measure 36px with `rgb(10, 147, 82)`, warning bars measure 24px with `rgb(168, 109, 9)`, and incident bars measure 14px with `rgb(201, 53, 75)`.
- Browser evidence in dark mode: the same 36/24/14px hierarchy resolves to the brighter theme colors `rgb(43, 229, 138)`, `rgb(241, 189, 89)`, and `rgb(255, 82, 104)`.
- Runtime check: the authenticated Chinese desktop route loaded representative mixed-status history with no browser errors or warnings.

## Channel Status endpoint and global USD-symbol correction QA

- Reported timeline state: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-645e512c-e761-4f64-8f88-007a9eda30ac.png`.
- Reported currency state: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-7eef0218-0af1-41ad-9fa0-eb86315dcf15.png`.
- Final focused timeline: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/channel-status-now-alignment-focused-final.png`.
- Final Dashboard: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/global-dollar-symbol-final.png`.
- Same-size comparisons:
  - `/Users/liwei/WebstormProjects/erxinai/output/design-qa/channel-status-now-reference-vs-final.png`
  - `/Users/liwei/WebstormProjects/erxinai/output/design-qa/global-dollar-symbol-reference-vs-final.png`
- Endpoint alignment: the timeline container now sizes itself from the rendered bar group instead of consuming the entire grid column. At the 2048px verification viewport, the bar group is 477px wide and both the final bar and the `现在` label end at x=1642px; the details button begins independently at x=1901px.
- Responsive desktop behavior: bars retain their 7px reference width when space permits and shrink within the chart area at narrower desktop widths, while both endpoint labels remain anchored to the rendered group.
- Currency behavior: every shared and route-local `Intl.NumberFormat` USD renderer now requests `currencyDisplay: "narrowSymbol"`. The Dashboard showed `$855.18`, `$0.0209`, `$204.8162`, `$2,162.7205`, `$178.9415`, and `$25.8747`, with zero `US$` matches in the rendered page.
- Browser console: no errors or warnings on the final Dashboard and Channel Status states.

## Dashboard usage-chart Y-axis QA

- Source visual truth: `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-1eaca066-55f8-463f-a33f-140871ad77d9.png`.
- Final light implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/dashboard-y-axis-light-viewport-final-normalized.png`.
- Final dark implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/dashboard-y-axis-dark-viewport-final.jpg`.
- Same-size comparison: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/dashboard-y-axis-reference-vs-final.png`.
- Viewport and normalization: source 2560 × 1352 pixels; implementation 2048 × 1080 CSS pixels at 1× density. The source was normalized to 2048 × 1080 for the side-by-side comparison.
- State: authenticated Chinese desktop Dashboard with representative seven-day token data, light and dark themes, no interaction overlay.
- Full-view evidence: the chart retains the existing panel size, line geometry, date labels, green accent, and glass substrate while adding a dedicated 54px Y-axis gutter. No neighboring card, quick action, or page gutter moved outside its existing desktop grid.
- Focused evidence: the left side of the chart visibly shows the `Token` unit and five aligned numeric levels. The verified fixture rendered `1000`, `750`, `500`, `250`, and `0`, with each label aligned to its horizontal grid line.
- Scale behavior: the upper bound is rounded to a readable 1/2/2.5/5/10 magnitude step, and tick text uses locale-aware compact notation so large production totals remain legible.
- Required fidelity surfaces: typography reuses the console monospace data stack and muted/body tokens; the 10px labels follow the existing compact chart hierarchy; grid lines reuse the theme line token; no raster asset was introduced; the visible copy is limited to the data unit and generated numeric values.
- Responsive/runtime evidence: document horizontal overflow remains zero at the 2048px desktop viewport. Light and dark themes both preserve readable contrast, and the browser console reported zero errors or warnings.
- Comparison history: the reported P1 omission left the line without any Y-axis unit or numeric scale. The correction added the unit, five magnitude-aware ticks, matching grid lines, and aligned the X-axis dates with the plot area. The final side-by-side comparison shows the complete axis without changing the surrounding information hierarchy.
- Findings: no actionable P0, P1, or P2 differences remain in the requested Y-axis scope.

final result: passed

---

# Design QA — Usage 费用明细（2026-08-02）

## Comparison target

- Source visual truth: `/var/folders/gk/q08f7_l552l_n3fyzsc25v_m0000gn/T/codex-clipboard-e799ca4b-4e0c-465a-9a68-196bf09d7abe.png`
- Browser-rendered dark implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/usage-cost-tooltip-dark.png`
- Browser-rendered light implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/usage-cost-tooltip-light.png`
- Browser-rendered narrow implementation: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/usage-cost-tooltip-mobile.png`
- Full-view comparison evidence: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/usage-cost-reference-vs-dark.png`
- Focused region comparison evidence: `/Users/liwei/WebstormProjects/erxinai/output/design-qa/usage-cost-focused-comparison.png`
- Source pixels: `361 × 280` at the supplied image density.
- Desktop implementation viewport: `960 × 640` CSS px at `1×`; clipped evidence is `756 × 279` px.
- Narrow implementation viewport: `390 × 844` CSS px at `1×`; screenshot is `390 × 844` px.
- Normalization: the full comparison uses equal `361 × 280` panels. The focused comparison places the shared user-visible tooltip region in equal `240 × 244` panels without rescaling typography.
- State: Chinese user Usage cost cell with representative token-billing data, information control focused, tooltip open. The actual `CostCell` component is mounted in the local browser QA entry because the protected `/usage` route redirects an unauthenticated preview session to login.

## Full-view comparison evidence

- The implementation preserves the source hierarchy: green user charge, circular information affordance, dark compact tooltip, top cost-breakdown section, separator, service tier, rate, original cost, and green user-billed total.
- Input/output/cache costs use six decimals; derived input/output prices use four decimals per one million Token; the resulting values match the supplied example exactly.
- The reference includes administrator-only account rate and account billing rows. They are intentionally omitted from the WayX user console, which follows the non-admin `sub2api` view and does not expose administrator billing data.

## Focused region comparison evidence

- The normalized focused comparison confirms the tooltip width, 8px radius, border weight, smoke-black surface, 12px UI typography, row alignment, divider, and cyan/violet/blue/green semantic accents.
- The implementation tooltip is `204 × 227` px for the shared user-visible content. The source is taller only because it continues with two administrator-only rows.

## Required fidelity surfaces

- Fonts and typography: native UI sans, 12px detail copy, compact line height, medium numeric weights, and tabular currency figures match the `sub2api` density. Long price strings remain on one line.
- Spacing and layout rhythm: the 204px tooltip width, 12px horizontal padding, 10px vertical padding, 14px label/value gap, 8px radius, and section separator follow the reference. The portal chooses the available side and clamps vertically to the viewport.
- Colors and visual tokens: the tooltip retains the reference's smoke-black fill and grey border while mapping billed cost, service tier, token prices, and rate to WayX's semantic green/cyan/violet/blue accents.
- Image quality and asset fidelity: this component contains no raster imagery, logos, or decorative assets. The information mark uses the console's existing icon library.
- Copy and content: Chinese and English labels cover input/output/image/cache costs, derived unit prices, image billing metadata, service tier, rate, original cost, and user charge. No administrator-only field is fabricated.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: the first browser-only tuning pass measured a 218px tooltip; it was tightened to the source's 204px width and slightly relaxed vertically before the normalized comparison.

## Comparison history

- The first normalized full and focused comparisons found no actionable P0/P1/P2 differences.
- No blocking iteration was required. The final dark, light, and 390px-wide captures all use the same production component and CSS.

## Primary interactions tested

- Click/focus activation of the information control, Escape dismissal, and same-control click reopening while focus remains.
- Light and dark console themes; the detail surface remains readable in both.
- `390 × 844` narrow viewport; the `204 × 227` tooltip remains fully inside the viewport with at least 8px edge clearance.
- Browser console on `localhost:5174`: no warning or error entries for the preview.
- Production Vite build completed successfully.

final result: passed

---

# Design QA — 余额、今日消费、公告换行与 API 端点（2026-07-28）

## 对照信息

- Source visual truth:
  - `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-9b727b74-96ca-4319-a02c-18f82db61452.png`
  - `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-70343a04-767c-4da6-a450-b217808e3c65.png`
  - `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-9ca3cf32-fd6a-4499-8884-f24304e9bdbc.png`
- Implementation screenshots:
  - `/private/tmp/erxinai-dashboard-light-final.png`
  - `/private/tmp/erxinai-dashboard-dark-final.png`
  - `/private/tmp/erxinai-keys-light-final.png`
  - `/private/tmp/erxinai-keys-dark-final.png`
- Same-size comparisons:
  - `/private/tmp/erxinai-dashboard-reference-compare.png`
  - `/private/tmp/erxinai-keys-reference-compare.png`
- Viewport: `2048 × 1080` CSS px, device scale factor `1`.
- State: authenticated Chinese desktop console with representative local fixture data, verified in light and dark themes.

## Findings

- P0：无。
- P1：无。
- P2：无。
- P3：无。

## Fidelity and data checks

- Dashboard balance: the primary `$855.18` value now resolves to the theme success green in both light and dark themes; header balance behavior remains unchanged.
- Today spend: the former cumulative actual-spend card now reads `今日消费`, displays `today_actual_cost`, and compares against the backend contract's `today_cost`. When an older fixture omits `today_cost`, the comparison safely retains the available current-day actual value instead of showing a misleading zero.
- Field contract: verified against `sub2api/frontend/src/api/usage.ts` and `backend/internal/pkg/usagestats/usage_log_types.go`, where `today_actual_cost` is today's actual deduction and `today_cost` is today's standard charge.
- Announcement line breaks: content normalizes real and escaped CR/LF sequences, list previews use `pre-line`, and the modal body uses `pre-wrap` plus safe long-line wrapping. The local fixture returned an empty announcement list, so the final verification used the rendered empty state plus source-level content/CSS inspection rather than fabricating persistent announcement data.
- API endpoint: endpoint label/icon, capsule, endpoint text, copy control, and latency-test control were enlarged as one unit. The light and dark screenshots show the toolbar remaining aligned with filters and actions without overflow.
- Browser runtime: Vite HMR completed successfully; browser logs contain no error or warning entries.

final result: passed

---

# Design QA — 余额、费用与 RPM / TPM 两位小数（2026-07-28）

## 对照信息

- Source visual truth:
  - `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-769ecb29-d831-4fbb-9b19-962304d37b1a.png`
  - `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-c592f991-a4b7-41a4-9e44-bb71f89c05a3.png`
- Implementation screenshots:
  - `/private/tmp/erxinai-number-format-dashboard.png`
  - `/private/tmp/erxinai-number-format-redeem.png`
- Full-view comparison: `/private/tmp/erxinai-number-format-comparison.jpg`
- Focused comparison: `/private/tmp/erxinai-number-format-focused-comparison.jpg`
- Viewport: `2048 × 1080` CSS px, device scale factor `1`.
- Source pixels: dashboard reference `2560 × 1352`; normalized to `2048 × 1080` for comparison.
- Implementation pixels: `2048 × 1080`.
- State: authenticated Chinese desktop console, light theme, representative local fixture data.

## Findings

- P0：无。
- P1：无。
- P2：无。
- P3：无。

## Fidelity surfaces

- Fonts and typography：数字沿用现有控制台字体、字号和字重；固定两位小数后没有换行、截断或卡片溢出。
- Spacing and layout rhythm：格式变短后，余额、实际消费和 RPM / TPM 仍保持原有卡片对齐和留白。
- Colors and visual tokens：未改变亮暗主题、玻璃透明度或语义颜色。
- Image quality and asset fidelity：本次改动不涉及图片资源；兑换码钱包素材仍保持原有清晰度和主题适配。
- Copy and content：顶部余额、仪表盘余额、实际消费、标准费用、今日费用和兑换码余额均固定两位；RPM 显示两位，TPM 显示两位并保留 `M`。

## Comparison history

- 初始证据：参考图中余额为 `$855.1832`、实际消费为 `$204.8168`、RPM / TPM 为 `0 / 0.000035M`，均不符合本轮目标。
- 修复：货币格式化器统一为 `minimumFractionDigits: 2` 与 `maximumFractionDigits: 2`；RPM 使用固定两位数字格式；TPM 使用固定两位的百万单位格式。
- 修复后证据：仪表盘显示 `$855.18`、`$204.82` 和 `0.00 / 0.00M`；顶部与兑换码余额均显示 `$855.18`。
- 浏览器控制台：仅有 Vite 连接与 React DevTools 信息，无 error 或 warning。

## Primary interactions tested

- 从仪表盘切换到兑换码页面。
- 切换到与参考图一致的亮色主题。
- 检查顶部余额、仪表盘统计卡和兑换码余额的一致格式。

final result: passed

---

# Design QA — Token 单位、时间筛选、兑换码、订单与个人资料（2026-07-28）

## 对照范围

- 仪表盘与时间范围筛选：用户提供的图 1、图 2。
- 兑换码页面：用户提供的图 3。
- 订单状态筛选：用户提供的图 4，并对照 `sub2api` 的用户侧状态语义。
- 个人资料：用户提供的图 5。
- 兑换码视觉对照图：`/private/tmp/redeem-design-comparison.jpg`。

## 验证结果

- 仪表盘：Token 汇总、趋势、构成、模型与明细统一使用 `M`（百万）单位；折线图纵轴明确标注 `Token (M)`。
- 时间范围：筛选器位于刷新按钮左侧，支持今天、昨天、最近 24 小时、最近 7 天、最近 14 天、最近 30 天、本月、上月与自定义起止日期；预设切换及应用状态正常。
- 兑换码：亮暗主题均复现余额总览、三项统计、钱包主题图、兑换表单、使用说明、礼物主题图及最近活动层级；玻璃对比度与主题素材显示正常。
- 订单：状态选项收敛为全部、待处理、已完成、失败、已退款，显示值正常；下拉宽度缩短为紧凑尺寸。
- 个人资料：账户头像、状态徽标、登录方式、余额通知和表单操作已恢复独立布局，无重叠、溢出或异常放大。
- 交互：时间预设更新、兑换码输入与清除、主题切换、订单筛选均通过浏览器实际操作检查。
- 稳定性：在全新页面会话中检查，控制台无 error 或 warning。

## 可接受差异

- 工程现有侧栏、顶栏与品牌信息继续保留。
- 当前测试数据没有兑换活动时，最近活动按设计显示空状态；后端返回数据后复用同一行结构。

## 缺陷分级

- P0：无。
- P1：无。
- P2：无。
- P3：无阻塞项。

final result: passed
