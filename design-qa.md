# Design QA

**Comparison target**

- Source visual truth: `/Users/liwei/Documents/二星AI/captures/source-desktop-step-00.png` and `/Users/liwei/Documents/二星AI/captures/source-mobile-step-00.png`
- Source state captures: `/Users/liwei/Documents/二星AI/captures/source-mobile-menu-open.png`, `/Users/liwei/Documents/二星AI/captures/source-feature-modal.png`, `/Users/liwei/Documents/二星AI/captures/source-pricing-two-machines.png`, `/Users/liwei/Documents/二星AI/captures/source-faq-open.png`
- Browser-rendered implementation: `/Users/liwei/Documents/二星AI/captures/implementation/desktop-top-1440.png` and `/Users/liwei/Documents/二星AI/captures/implementation/mobile-top-390.png`
- Demo media source: `/var/folders/gk/q08f7_l552l_n3fyzsc25v_m0000gn/T/codex-clipboard-560b45bc-b972-43e9-9992-dbd82816ca59.png`
- Demo media implementation: `/Users/liwei/Documents/二星AI/captures/implementation/desktop-gateway-animations-light.png` and `/Users/liwei/Documents/二星AI/captures/implementation/mobile-gateway-animations-light-390.png`
- Trace demo source: `/var/folders/gk/q08f7_l552l_n3fyzsc25v_m0000gn/T/codex-clipboard-4c7a15aa-0025-4df3-a5de-9058cf320d36.png`
- Trace demo implementation: `/Users/liwei/Documents/二星AI/captures/implementation/desktop-trace-static.png` and `/Users/liwei/Documents/二星AI/captures/implementation/mobile-trace-static-390.png`
- Viewports: `1440 × 1000` desktop and `390 × 844` mobile
- States: top/default, sticky header, mobile navigation open, feature composer open, two-machine price selected, first FAQ expanded, footer

**Full-view comparison evidence**

- Desktop hero: `/Users/liwei/Documents/二星AI/captures/qa/desktop-top-full.png`
- Desktop feature grid: `/Users/liwei/Documents/二星AI/captures/qa/desktop-features-full.png`
- Desktop pricing: `/Users/liwei/Documents/二星AI/captures/qa/desktop-pricing-full.png`
- Desktop FAQ: `/Users/liwei/Documents/二星AI/captures/qa/desktop-faq-full.png`
- Mobile hero: `/Users/liwei/Documents/二星AI/captures/qa/mobile-top-full.png`
- Mobile navigation: `/Users/liwei/Documents/二星AI/captures/qa/mobile-menu-full.png`
- Mobile composer: `/Users/liwei/Documents/二星AI/captures/qa/mobile-feature-modal-full.png`
- Mobile pricing: `/Users/liwei/Documents/二星AI/captures/qa/mobile-pricing-full.png`
- Mobile FAQ: `/Users/liwei/Documents/二星AI/captures/qa/mobile-faq-full.png`
- Replaced desktop demo media: `/Users/liwei/Documents/二星AI/captures/implementation/desktop-gateway-animations-light.png`
- Static Trace request analytics media: `/Users/liwei/Documents/二星AI/captures/implementation/desktop-trace-static.png`

**Focused region comparison evidence**

- Desktop hero typography, CTA, and agent icons: `/Users/liwei/Documents/二星AI/captures/qa/desktop-hero-focused.png`
- Mobile navigation, headline, CTA, and agent icons: `/Users/liwei/Documents/二星AI/captures/qa/mobile-header-focused.png`
- Demo media frame and border treatment: the latest supplied Trace source image and `/Users/liwei/Documents/二星AI/captures/implementation/desktop-trace-static.png` were opened together for the final comparison.

**Findings**

- No actionable P0, P1, or P2 mismatch remains.
- Fonts and typography: the source Schibsted Grotesk, Instrument Serif Italic, Geist Mono, and system font stack are used locally. Sizes, weights, line heights, letter spacing, wrapping, and optical hierarchy match at both target viewports.
- Spacing and layout rhythm: hero, grid, pricing, FAQ, sticky navigation, footer, section gaps, radii, borders, and shadows match the source measurements and same-viewport captures.
- Colors and visual tokens: the source hero treatment, glass surfaces, and surrounding homepage palette remain unchanged. The four demos now use a light fog-white canvas, white panels, pale blue borders, dark slate text, and restrained blue/green/red semantic states that fit the homepage without losing data contrast.
- Image quality and asset fidelity: the latest supplied 2144 × 884 request analytics screenshot is reused directly in the Trace panel without distortion, cropping, animation, or remote loading. It uses `object-fit: contain` inside the existing 16:9 frame. The other three demos remain code-rendered and unchanged.
- Copy and content: the four feature titles and subtitles now use the approved AI-gateway copy. Other homepage, pricing, FAQ, and footer copy remains unchanged.
- Responsive behavior: desktop uses the two-column feature grid and expanded navigation; mobile uses the stacked grid, drawer navigation, compact pricing card, and single-column footer without clipping or horizontal overflow.
- Interaction states: anchor navigation, sticky header, mobile drawer open/close, feature composer open/close, machine price selection, FAQ expansion, model cycling, Python/TypeScript switching, usage chart motion, and provider failover were exercised successfully. The Trace panel is intentionally static per the latest requirement. Other animations pause outside the viewport.
- Accessibility: semantic links, buttons, radiogroup states, labels, `aria-expanded`, visible focus treatment, alt text, reduced-motion rules, and practical mobile tap targets are present.
- Intentional difference: the four demo contents, titles, and subtitles changed to the AI-gateway story. Card geometry, spacing, responsive order, borders, and surrounding sections remain unchanged.

**Open Questions**

- The external feature-request submission was not sent during QA because that would create a third-party side effect. The local clone preserves the captured composer UI and open/close behavior without transmitting user-entered data.
- The fourth panel assumes automatic failover is supported because the selected brief explicitly requests the primary-to-backup route transition. If production does not support this, change the title to `Know when providers fail.` and remove the automatic takeover claim.

**Comparison history**

- Pass 1: the original clone passed without actionable P0/P1/P2 visual mismatches.
- Pass 2: the supplied four-card reference and the rendered replacement were compared together. The four new assets load locally, fill the same media frames, preserve the original grid and border treatment, and introduce no horizontal overflow. No post-comparison visual fix was required.
- Pass 3: temporary static screenshots were removed and replaced with original looping UI demos. Python and TypeScript states were both observed, animation frames differed, desktop and mobile remained overflow-free, and the console reported no warnings or errors.
- Pass 4: all four demo surfaces were converted from dark to light. Browser checks confirmed white content panels, the light outer canvas, preserved 16:9 geometry, no horizontal overflow at 1440px or 390px, and no console warnings or errors.
- Pass 5: the Trace demo was replaced with the exact user-supplied request analytics visual. Desktop and mobile browser captures confirmed the image loads locally at its original 2144 × 884 resolution, remains undistorted with `object-fit: contain`, runs the viewport-aware focus animation, preserves the existing card geometry, introduces no horizontal overflow, and reports no console warnings or errors.
- Pass 6: the experimental Trace zoom and interactive simulation were removed. The latest user-supplied image now renders as a fully static local asset with no animation and no interactive Trace elements. Desktop and mobile captures confirmed the original 2144 × 884 dimensions, preserved 16:9 card geometry, no horizontal overflow, and no console warnings or errors.

**Primary interactions tested**

- Desktop: feature, pricing, and FAQ navigation; two-machine pricing; FAQ open/close; sticky glass header; four viewport-aware looping demos; Python/TypeScript and model switching; provider degradation/failover.
- Mobile: drawer open/close; feature composer open/close; two-machine pricing; FAQ open/close; sticky glass header; footer layout.
- Console errors checked: no warnings or errors were reported after the default, pricing, FAQ, menu, composer, or animated demo states.

**Implementation Checklist**

- [x] Desktop source and implementation compared at `1440 × 1000`.
- [x] Mobile source and implementation compared at `390 × 844`.
- [x] Fonts, spacing, colors, image quality, icons, and copy checked.
- [x] Primary interactions and responsive states checked.
- [x] Browser console checked.

**Follow-up Polish**

- P3: external feature-request submission remains intentionally untested and non-transmitting in the local prototype.

## Authentication component QA

**Comparison target**

- Theme source visual truth: `/Users/liwei/Documents/二星AI/captures/source-desktop-step-00.png`
- Content and behavior references: `/Users/liwei/GolandProjects/sub2api/frontend/src/views/auth/LoginView.vue`, `/Users/liwei/GolandProjects/sub2api/frontend/src/views/auth/RegisterView.vue`, and `/Users/liwei/GolandProjects/sub2api/frontend/src/components/layout/AuthLayout.vue`
- Browser-rendered implementation: `/Users/liwei/Documents/二星AI/captures/implementation/auth-login-desktop.png`, `/Users/liwei/Documents/二星AI/captures/implementation/auth-register-desktop.png`, and `/Users/liwei/Documents/二星AI/captures/implementation/auth-login-mobile-simplified-390.png`
- Viewports: `1440 × 1000` desktop and `390 × 844` mobile
- States: login default, registration default, invalid registration, strong password, optional invitation/promo fields expanded, loading, and successful registration

**Full-view and focused comparison evidence**

- The homepage theme source, desktop login, desktop registration, and mobile login captures were opened together for the final comparison.
- The desktop form card was additionally inspected at `470 × 547`; the mobile card was inspected at `370px` wide inside the `390px` viewport.

**Findings**

- No actionable P0, P1, or P2 issue remains.
- Fonts and typography: Schibsted Grotesk and Instrument Serif are reused from the homepage. The authentication hierarchy preserves the homepage's bold grotesk plus expressive italic-serif pairing, with readable 12–14px form text and no clipped labels.
- Spacing and layout rhythm: the desktop two-column composition balances the brand statement and 470px form card; mobile collapses to a single 370px card with 10px side margins and no horizontal overflow.
- Colors and visual tokens: the existing sky, aqua, fog-white, dark-slate, and translucent-blue palette is retained. Glass borders, highlights, shadows, and focused controls remain visible without sacrificing input contrast.
- Image quality and asset fidelity: the homepage fluted crystal scene and local Sentence AI logo are reused directly. No placeholder artwork or remote assets were introduced.
- Copy and content: login uses email, password, password visibility, persistent-session choice, reset guidance, loading, and success feedback. Registration uses email, password strength, optional invitation/promo codes, agreement validation, loading, and verification guidance based on the referenced `sub2api` flows. The duplicate top-level login/register switch was removed; the footer prompts are now the single mode-change affordance.
- Interaction and accessibility: login/register tabs update the route, validation is field-specific, optional fields are disabled and `aria-hidden` while collapsed, password strength updates live, reduced-motion rules are present, and all buttons have themed focus-visible states.
- Responsive behavior: desktop and mobile states remain overflow-free. The mobile login screen fits fully within `390 × 844` without hiding the primary action.

**Authentication comparison history**

- Pass A: initial browser QA found the browser's native black focus outline on the selected registration tab and collapsed optional inputs still available to assistive navigation. These were classified as P2 polish/accessibility issues.
- Pass B: the tab and button focus states were restyled with the blue crystal token; collapsed optional inputs now expose `aria-hidden=true`, `disabled`, and `tabIndex=-1`. Revised desktop and mobile captures show no remaining P0/P1/P2 issue, and the fresh browser session reports no warnings or errors.
- Pass C: the duplicate top authentication switch was removed from both login and registration. Revised desktop and `390 × 844` mobile captures show tighter card hierarchy, preserve the footer `Create an account` / `Log in` transition, introduce no overflow, and report no console warnings or errors.

**Authentication interactions tested**

- Mode switching between `/login` and `/register` through the footer prompts.
- Empty-form validation for email, password, and terms acceptance.
- Valid email readiness, password strength `4 of 4`, optional promo entry, loading state, and successful registration feedback.
- Mobile rendering at `390 × 844`, desktop rendering at `1440 × 1000`, horizontal overflow, and console output.

final result: passed
