# Design QA — 中转效率驾驶舱

## Evidence

- Source visual truth: `/Users/liwei/.codex/generated_images/01a000db-920b-72e0-a0f3-9b021c307c28/exec-9ffbf21b-4959-4147-b2e2-0c2aeabf2de2.png`
- Final browser implementation: `/private/tmp/dashboard-heatmap-spacing-fixed.png`
- Full-view comparison: `/private/tmp/dashboard-heatmap-spacing-full-comparison.png`
- Focused heatmap comparison: `/private/tmp/dashboard-heatmap-spacing-focused-comparison.png`
- Focused lower-panel comparison: `/private/tmp/relay-efficiency-spacing-focused-comparison.png`
- Focused routing comparison: `/private/tmp/relay-route-comparison-dark.png`
- Focused metric comparison: `/private/tmp/relay-metrics-comparison-dark.png`
- Source pixels: 1747 × 900.
- Implementation viewport and pixels: 1920 × 936 CSS px at device pixel ratio 1.
- Density normalization: the full implementation capture was scaled proportionally to 1747 px wide before stacking it with the source. The focused source and implementation lower rows were cropped from their native captures and each scaled to 1600 px wide before stacking.
- State: Chinese locale, dark theme, overview route, no current-day usage, cumulative platform fallback active.

## Findings

- No actionable P0, P1, or P2 findings remain.
- The live account has two platform routes rather than the four illustrative routes in the mock. This is expected dynamic-content variation, not design drift.
- The cache bar preserves Appica `Meter` semantics while reproducing the mock's nine discrete segments: 0.75rem track height, one-token corner rounding, a dark-to-bright active ramp, and neutral inactive blocks. Its layout compensates for the page's `0.9` CSS zoom and snaps the track to the rendered pixel grid; all nine cells measure exactly `15px` and all eight gaps measure exactly `2px` at the QA viewport.
- The 92.3% state now renders eight complete segments and 30.7% of the ninth segment, so the final block retains a visible unfilled remainder without changing the gap rhythm.
- The heatmap compensates for the same page-level zoom and snaps its dynamic 23-column × 7-row grid to rendered pixels. At the QA viewport every cell is exactly `14px × 14px`; all horizontal and vertical gaps, including the weekday-label rows, are exactly `3px`.
- The routing table uses the source's left-aligned column starts. At the QA viewport they resolve to `1306.19`, `1525.39`, `1656.38`, and `1752.08` CSS px; the normalized focused comparison aligns with the reference within seven pixels.
- Platform markers reuse the existing `PlatformMark` brand icons. Routing meters use the reference's blue ramp for every platform while the icon color carries platform identity.

## Required Fidelity Surfaces

- Fonts and typography: preserved the product's existing font stack and optical hierarchy. Panel titles, metric labels, numeric values, table headers, and footer insight match the source's relative weight, scale, line height, and truncation behavior.
- Spacing and layout rhythm: the heatmap and efficiency panel form the same asymmetric lower grid as the source. Heatmap cells and both grid axes now use an integer-pixel rhythm after page scaling; the metric cluster, vertical dividers, routing table, footer divider, card radius, and desktop density align in the full and focused comparisons. At 1920 × 936 the new panel ends above the viewport bottom, so every component is visible without scrolling.
- Colors and visual tokens: all new surfaces use Appica/role-based tokens. Dark-theme background, muted borders, foreground hierarchy, blue cache state, platform-icon identity colors, and the shared blue routing-meter ramp match the selected direction without hard-coded palette values.
- Image quality and asset fidelity: the selected lower panel contains no raster imagery. Existing brand assets were preserved, icons come from the installed Appica icon set, and the charts remain native data visualizations; no placeholder imagery, handcrafted SVG, or substitute CSS illustration was introduced.
- Copy and content: labels use real metric scopes. When today's routing data is empty, the component falls back to existing cumulative platform fields and changes the scope badge to `路由 · 累计`; it never displays mock values as real data.
- Accessibility and behavior: meters expose `role="meter"`, labels, and current values. The time-range menu opens and closes correctly, focus remains visible for keyboard use, and the page has no browser console warnings or errors.
- Viewport resilience: checked 1920 × 936, 1280 × 800, and 760 × 900. The dashboard has no horizontal document overflow; the lower grid collapses to one column and the efficiency body stacks on narrow screens.

## Comparison History

1. Initial browser pass — `/private/tmp/relay-efficiency-dashboard-dark-v1.png`
   - [P2] With zero current-day traffic, the entire routing half was empty, which materially weakened the selected composition and the component's usefulness.
   - Fix: use the same dashboard response's `total_*` platform fields only when all `today_*` platform fields are empty, and expose the change with a `路由 · 累计` badge.
2. Final browser pass — `/private/tmp/relay-efficiency-dashboard-final-clean.png`
   - The real cumulative route rows restore the intended information density, meter alignment, and visual balance.
3. Precision pass — `/private/tmp/relay-efficiency-segmented-exact.png`
   - [P2] The first cache treatment used a masked continuous fill, created a partial trailing block, and did not match the mock's segment count or inactive-track color.
   - [P2] The second and third metric labels sat below the cache label because their content used independent flex spacing.
   - Fix: render nine real segments inside the Appica meter, quantize the active state, match the reference's non-linear blue ramp and neutral remainder, and place all three metrics on a shared four-row grid.
4. Fractional and routing pass — `/private/tmp/relay-efficiency-revision-dark.png`
   - [P2] Quantizing the cache value filled the ninth block completely at 92.3%, overstating the visible result; the change label also exposed percentage-point notation rather than a percentage change.
   - [P2] Routing columns used proportional right-aligned tracks that pushed actual spend and route share away from the source anchors. Per-platform meter colors and generic square markers also diverged from the selected design and existing group identity system.
   - Fix: preserve nine equal fixed cells while filling the final cell fractionally, calculate the seven-day comparison as a relative percentage, use the measured four-column proportions and left alignment, apply one role-based blue meter ramp, and reuse `PlatformMark` icons.
   - The combined lower-panel, routing, and metric comparisons show no remaining P0/P1/P2 mismatch.
5. Pixel-snapping and routing-density pass — `/private/tmp/relay-efficiency-spacing-fixed.png`
   - [P2] The nominal `0.125rem` cache gap became `1.8px` after the page-level `0.9` zoom. Although the layout rectangles reported equal subpixel gaps, rasterization made alternating gaps look one or two pixels wide.
   - [P2] With only two live platform rows, `justify-content: center` left excess space between the routing header and the first record.
   - Fix: derive one rendered-pixel unit from the page scale, use CSS `round(down, …)` to make the available track width divisible into nine equal rendered cells, and compensate the gap to exactly two rendered pixels. Align the route list to the start and reduce its table top padding.
   - Post-fix evidence: nine `15px` cells, eight `2px` gaps, no space between the table header box and first row, and a `25.19px` titlebar-to-first-row distance. The focused stacked comparison shows the tighter routing rhythm without changing the four-column alignment.
6. Heatmap pixel-grid pass — `/private/tmp/dashboard-heatmap-spacing-fixed.png`
   - [P2] The heatmap's nominal `3px` row and column gaps became `2.7px` after the page-level `0.9` zoom. Equal subpixel geometry therefore rasterized with visibly inconsistent upper/lower spacing.
   - Fix: derive the heatmap gap from the rendered-pixel unit, snap the available dynamic grid width to a multiple of its column count, and apply the same exact gap to the seven weekday rows.
   - Post-fix evidence: all 161 cells resolve to `14px × 14px`, all 22 horizontal gaps and all six vertical gaps resolve to `3px`, weekday labels share the same `14px` row height and `3px` gaps, and the focused comparison shows a uniform grid rhythm.

## Implementation Checklist

- [x] Existing API fields verified and used without backend changes.
- [x] Real cache reuse, actual cost per million tokens, and balance runway calculations implemented.
- [x] Real platform distribution with explicit current-day/cumulative scope implemented.
- [x] Appica Badge and Meter components used.
- [x] Desktop fit, narrow-width behavior, menu interaction, meter semantics, and console logs verified.
- [x] Production build and `git diff --check` passed.

final result: passed

---

# Design QA — 渠道状态历史像素间距

## Evidence

- Scoped source capture: `/private/tmp/channel-status-history-spacing-before.png`
- Final browser implementation: `/private/tmp/channel-status-history-spacing-fixed.png`
- Full-view comparison: `/private/tmp/channel-status-history-full-comparison.png`
- Focused status-history comparison: `/private/tmp/channel-status-history-focused-comparison.png`
- Source, viewport, and implementation pixels: 1920 × 992 at device pixel ratio 1.
- State: Chinese locale, authenticated channel-status route, Light theme, 7-day window, one selected channel, 48 status data points.
- Scope: preserve the existing component and data while making every inter-cell gap visually identical.

## Findings

- No actionable P0, P1, or P2 findings remain.
- Before the fix, the nominal `2px` gap became `1.796875px` under the page-level `0.9` zoom and rasterized inconsistently across the 48 cells.
- The final implementation derives a rendered-pixel unit from the page scale. All 47 gaps now measure exactly `2px`, while the timeline width, 48-point distribution, status colors, labels, and surrounding inspector layout remain unchanged.
- No Vite error overlay was present after the change.

## Required Fidelity Surfaces

- Fonts and typography: unchanged.
- Spacing and layout rhythm: only the status-cell column gap changed; panel dimensions and timeline width are unchanged.
- Colors and visual tokens: status colors remain existing semantic success, warning, error, and background tokens.
- Image quality and assets: no image or icon asset changed.
- Copy and content: live status values and labels remain unchanged.
- Accessibility and behavior: the existing `role="img"` and aria summary remain intact; no interaction behavior changed.

## Comparison History

1. Initial capture — `/private/tmp/channel-status-history-spacing-before.png`
   - [P2] The `0.125rem` gap became a non-integer rendered distance under the global scale, producing visibly uneven spacing.
2. Final capture — `/private/tmp/channel-status-history-spacing-fixed.png`
   - Fix: compensate the gap by the page scale so the rendered separation is exactly two pixels.
   - Post-fix evidence: 48 status cells, 47 gaps, every gap exactly `2px`; the focused before/after comparison shows no surrounding layout drift.

## Implementation Checklist

- [x] 48-point status history preserved.
- [x] All rendered inter-cell gaps verified at exactly 2px.
- [x] Timeline width and inspector layout preserved.
- [x] Browser error overlay checked.
- [x] Production build and `git diff --check` passed.

final result: passed

---

# Design QA — 概览指标图标垂直对齐

## Evidence

- Source visual truth: `/Users/liwei/.codex/generated_images/019ffbf9-385d-7bf2-a559-7a406fba5d5e/exec-1bd18e30-11a0-4fb4-a9e1-253d003bb686.png`
- Final Light implementation: `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dashboard-light-icon-alignment-1743x902.png`
- Final Dark implementation: `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dashboard-dark-icon-alignment-1743x902.png`
- Full-view comparisons: `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/light-icon-alignment-full-comparison.png`, `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dark-icon-alignment-full-comparison.png`
- Focused comparisons: `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/light-icon-alignment-focused-comparison.png`, `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dark-icon-alignment-focused-comparison.png`
- Before/after comparisons: `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/light-icon-alignment-before-after.png`, `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dark-icon-alignment-before-after.png`
- Source, viewport, and implementation pixels: 1743 × 902 at device pixel ratio 1.
- State: Chinese locale, authenticated overview route, Light and Dark themes.

## Findings

- No actionable P0, P1, or P2 findings remain.
- The metric icon is shifted down by `0.25rem` with a visual transform, centering it more naturally against the label-and-value pair.
- The transform does not participate in layout, so the metric strip remains `1455 × 117` CSS px and the first metric remains 94 CSS px high at the QA viewport.
- Typography, colors, data, card dimensions, chart layout, Token heatmap, and relay-efficiency panel are unchanged.
- Both theme states render the new alignment consistently, and the final interaction pass produced no browser console warnings or errors.

## Required Fidelity Surfaces

- Fonts and typography: unchanged.
- Spacing and layout rhythm: only the icon's painted Y position changed; no grid track or container measurement changed.
- Colors and visual tokens: unchanged.
- Image quality and assets: existing Appica icons remain crisp vector assets; no new asset was introduced.
- Copy and content: unchanged.

## Comparison History

1. Previous implementation — `dashboard-light-final-1743x902.png`, `dashboard-dark-final-1743x902.png`
   - [P2] Metric icons sat slightly high relative to the combined label-and-value block.
   - Fix: add `transform: translateY(0.25rem)` to `.console-dashboard-metric-icon`.
2. Final focused pass — before/after and source/final comparison files listed above.
   - The icons visibly move down without shifting labels, values, dividers, or card boundaries. No remaining P0/P1/P2 mismatch exists for the requested alignment change.

## Implementation Checklist

- [x] Light and Dark states captured.
- [x] Metric strip dimensions verified unchanged.
- [x] Browser console checked with no new warnings or errors.
- [x] Production build and `git diff --check` passed.

final result: passed

---

# Design QA — 概览页 Light / Dark 着色

## Evidence

- Light source visual truth: `/Users/liwei/.codex/generated_images/019ffbf9-385d-7bf2-a559-7a406fba5d5e/exec-1bd18e30-11a0-4fb4-a9e1-253d003bb686.png`
- Dark source visual truth: `/Users/liwei/.codex/generated_images/019ffbf9-385d-7bf2-a559-7a406fba5d5e/exec-ac87b8c3-d55d-440f-b3a2-6008c9e687f9.png`
- Final Light implementation: `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dashboard-light-final-1743x902.png`
- Final Dark implementation: `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dashboard-dark-final-1743x902.png`
- Full-view comparisons: `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/light-comparison-full.png`, `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dark-comparison-full.png`
- Focused comparisons: `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/light-comparison-focus.png`, `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dark-comparison-focus.png`
- Source, viewport, and implementation pixels: 1743 × 902 at device pixel ratio 1.
- State: Chinese locale, authenticated overview route, active overview navigation item, Light and Dark themes.

## Findings

- No actionable P0, P1, or P2 findings remain within the requested coloring scope.
- The sidebar active state uses a low-saturation blue surface in both themes; no orange navigation state remains. Hover and active icons use the same semantic blue emphasis.
- The seven metric cards retain their original row dimensions and data while gaining Appica icons with blue, green, violet, cyan, orange, and rose semantic treatments.
- Token trend and model distribution retain their existing native chart structure. Only the chart role colors changed, producing a blue high-contrast trend and blue/green/orange/violet distribution segments.
- The bottom Token heatmap and relay-efficiency panel were excluded from this coloring change as requested.
- Current live values differ from the illustrative references. This is expected dynamic-content variation, not design drift.

## Required Fidelity Surfaces

- Structure and dimensions: no component, dataset, panel, width, or section height was removed or resized. At the QA viewport the hero is `1455 × 152`, metric strip `1455 × 117`, chart grid `1455 × 300`, Token heatmap `470 × 224`, and relay-efficiency panel `974 × 224` CSS px.
- Colors and tokens: all additions use Appica role-based variables and `color-mix`; no literal palette values or hue-based Tailwind utilities were added. Light surfaces remain restrained while Dark icon backgrounds use dark tinted fills rather than bright orange blocks.
- Icons and assets: metric icons come from the installed Appica icon package through the existing `Icon` wrapper. No handwritten SVG, emoji, image asset, or placeholder was introduced.
- Accessibility and behavior: semantic icon contrast remains readable in both themes. Theme switching and existing navigation links continue to work, and the final interaction pass produced no new console warnings or errors.
- Excluded surfaces: the existing heatmap and relay-efficiency implementation, values, sizing, and Appica component usage remain unchanged by this pass.

## Comparison History

1. Initial Light browser pass — `/Users/liwei/WebstormProjects/erxinai/artifacts/design-qa/2026-08-15-dashboard-color/dashboard-light-1920x1024.png`
   - [P2] Appica `primary` resolves to the neutral foreground role in this theme, so the initial trend line, first donut segment, and active navigation icon remained black instead of the approved blue.
   - Fix: move interactive blue and first-series mappings to `secondary-emphasis`, retain role-based green/orange, and derive violet by mixing semantic secondary and error roles.
2. Light/Dark refinement pass — final implementation captures listed above.
   - [P2] Direct muted role fills made metric icons and the Dark active navigation surface more saturated than the approved low-fatigue treatment.
   - Fix: mix muted semantic roles with the current theme background, add subtle current-color borders, and use the derived violet for latency and usage accents.
3. Final side-by-side pass — full-view and focused comparison files listed above.
   - No remaining P0/P1/P2 mismatch exists in the requested sidebar, quick-action, metric, trend, or model-distribution coloring scope.

## Implementation Checklist

- [x] Existing components, data, panel widths, and panel heights preserved.
- [x] Model distribution component structure preserved.
- [x] Sidebar active and hover color styles applied globally.
- [x] Light and Dark theme switching verified.
- [x] Final browser interaction pass has no new console warnings or errors.
- [x] Production build and `git diff --check` passed.

final result: passed
