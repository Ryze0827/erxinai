# Approved console design references

These images are the visual source of truth for the later unified console implementation. Do not replace an approved image in place; add a versioned successor only after the user confirms a revision.

## Global WayX brand lockup

- Status: approved on 2026-08-11
- Reference: `global-wayx-brand-lockup-reference-dark-v1.png` (top-left brand area only; the surrounding Subscriptions layout is not selected by this reference)
- Scope: every authenticated console page and every future console mock, in both themes and at every sidebar state.
- Visual direction: use the same lockup shared by design options 1 and 3: the purple/blue crossed-X WayX mark followed by the white `WayX` wordmark, with identical scale, spacing, alignment, and sidebar inset everywhere. In the expanded desktop sidebar, the compact rounded-square collapse control sits immediately to the right of the lockup in the same header row. The collapsed desktop rail uses the mark alone and the same header control switches to the expand direction; the control never moves into a bottom `Collapse sidebar` row. Mobile brand headers use the complete lockup and the existing drawer control.
- Branding contract: preserve the existing public-brand resolution behavior. A configured public `siteLogo` may replace the default crossed-X mark without changing the lockup geometry; the visible wordmark remains `WayX`, and the unresolved-brand blank state still prevents a default-logo flash.
- Conformance audit: all previously approved page references already use this logo-right collapse-control anatomy except the original Subscriptions option 2 image. Its logo was corrected in `v2`, and the collapse control was corrected in `subscriptions-approved-dark-v3.png`; `v1` and `v2` remain only as superseded history.

## Global light theme

- Status: complete design set, ready for user review on 2026-08-11
- Theme master: `overview-approved-light-v3.png` (`overview-approved-light-v1.png` and `overview-approved-light-v2.png` are superseded)
- Structural invariant: every light reference preserves the corresponding approved dark reference's visible content, data, component anatomy, density, spacing, hierarchy, sidebar, logo-right collapse control, and 16:9 composition. Theme is the only intended difference.
- Palette: cool pearl-white and ice-blue glass surfaces with deep ink-navy typography, medium slate metadata, ocean blue/cyan/teal as the primary interactive and analytical family, and fluorescent green for primary actions and positive/healthy states. Amber and red retain warning/error meaning. Purple is restricted to the WayX mark and occasional minor secondary data-series differentiation; it is never the dominant light-theme accent.
- Materials: the homepage fluted landscape remains a faint visible substrate; top-level surfaces use milky translucent glass, blue-gray metallic borders, soft specular highlights, and restrained elevation. Nested controls use crisp translucent fills rather than additional live blur.
- Selection language: active navigation, tabs, focus rings, row selections, pagination, and neutral secondary actions use pale cyan-blue fills with ocean-blue accents. Provider marks and business-semantic colors retain their recognizable identity.

## Global console navigation hierarchy

- Status: current global shell revision requested on 2026-08-11
- Dark shell master: `overview-approved-dark-v2.png`
- Light shell master: `overview-approved-light-v3.png`
- `Overview` is a standalone global destination immediately below the brand header and above every section label. It never appears inside `WORKSPACE`; its icon and semibold 18px label are larger than ordinary navigation entries.
- `WORKSPACE` contains exactly `API Keys`, `Batch Images`, `Usage`, `Available Channels`, and `Channel Status`.
- `ACCOUNT` contains exactly `Add credit`, `Orders`, `Redeem`, and `Affiliate`.
- `TOOLS` contains exactly `Image Studio` and `Image API Docs`. The former `GPT Image` / `GPT Image Studio` visible label is retired; the application route remains `/image-studio`.
- `Erxin Member Store` remains a separate external destination beneath the grouped navigation. The workspace-owner card remains fixed at the bottom.
- These shell masters supersede the sidebar hierarchy visible in every older page mock. Older approved references remain the source of truth for their page content, layout, density, and interactions, but not for sidebar grouping, the Overview placement, or the Image Studio label.
- Color restraint is global: dark navigation uses neutrals plus one indigo accent; light navigation uses neutrals plus one ocean-blue accent. Provider identity and semantic success/warning/error colors remain available only where their meaning requires them.

## Overview

- Status: approved
- Reference: `overview-approved-dark-v2.png` (`overview-approved-dark-v1.png` is superseded)
- Light reference: `overview-approved-light-v3.png` (`overview-approved-light-v1.png` and `overview-approved-light-v2.png` are superseded)
- Viewport: 1920 × 1080, dark theme
- Key constraints: use the WayX Night Briefing shell; keep the Token heatmap; use exactly seven heatmap cells per weekly column; show comparison indicators only for requests, Tokens, and spend. Reduce decorative color across cards and charts: use neutral surfaces and typography, one theme accent family, and semantic green only for positive/savings meaning.

## API Keys

- Status: approved on 2026-08-11
- Reference: `api-keys-approved-dark-v1.png`
- Light reference: `api-keys-approved-light-v1.png`
- Viewport: 1920 × 1080, dark theme
- Key constraints: use a responsive 2 × 2 endpoint area for four configured endpoints; each endpoint keeps its copy and latency-test controls immediately after the URL; endpoint labels describe configured routes (`Default`, `Route 1`, `Route 2`, `Route 3`) rather than API groups, models, platforms, or product capabilities.
- Visible endpoint examples: `https://api.wayx.ai`, `https://api-1.wayx.ai`, `https://api-2.wayx.ai`, `https://api-3.wayx.ai`.
- Implementation note: visible labels and URLs are examples only. Render the configured default/custom endpoint data returned by the existing application contract.

## Usage

- Status: approved on 2026-08-11
- Reference: `usage-approved-dark-v1.png`
- Light reference: `usage-approved-light-v1.png`
- Viewport: 1920 × 1080, dark theme
- Source-of-truth business reference: `/Users/liwei/GolandProjects/sub2api`
- Contract constraint: preserve the meaning and availability of the original user Usage APIs, filters, usage/error records, billing fields, model/group distributions, sorting, pagination, export, and detail disclosures. The page's information architecture and visual composition may be redesigned from scratch.
- Current direction: retain the broad ledger-plus-insights silhouette of the first Usage exploration, but rebuild the records for a stable fixed-column scan. FT and user-billed cost are primary; total duration and standard/original cost are secondary.
- Token language: always combine consistent outline icons with explicit `IN`, `OUT`, `READ`, and `WRITE` labels; never use unlabeled colored dots or percentages as the only explanation.
- Detail behavior: Token and cost breakdowns open as anchored hover/focus panels without resizing rows. Cost disclosure follows the user-side `sub2api` fields and omits administrator-only account/channel data.

## Channel monitoring

- Status: approved on 2026-08-11
- Reference: `channel-status-approved-dark-v1.png`
- Light reference: `channel-status-approved-light-v1.png`
- Viewport: 1920 × 1080, dark theme
- Current direction: use the selected master-detail Route Inspector. Keep the compact range/status/search/refresh toolbar and five-metric overview, then use a scalable channel master list on the left and a selected-channel diagnostic inspector on the right.
- Contract constraint: preserve the existing `/channel-monitors` and `/channel-monitors/:id/status` user-facing semantics, including window and status filters, manual and automatic refresh, channel/provider/model identity, current status, latency, Ping, availability, latest check time, 48-point history, and per-model 7/15/30-day detail data.
- Status language: healthy, warning, incident, and unknown remain distinguishable by label as well as color. Timeline bars encode healthy as tallest green, warning as medium amber, incident as shortest red, and unknown as muted gray. Latency and Ping are always displayed in milliseconds; average latency remains green through 5000 ms and turns red only above 5000 ms.

## Add credit

- Status: approved on 2026-08-11
- Reference: `add-credit-approved-dark-v1.png`
- Light reference: `add-credit-approved-light-v1.png`
- Viewport: 1920 × 1080, dark theme
- Current direction: use the three-stage Checkout Runway with Amount, Payment, and Review visible in one desktop workspace. Keep the balance/subscription switch and panoramic account overview above the transaction surface.
- Contract constraint: preserve checkout-provided payment methods, provider display names and marks, min/max availability, the eight USD presets, custom USD amount, balance/subscription behavior, secure-payment disclosure, and the existing payment launch/result flow. Do not fabricate discounts, exchange rates, or fee summaries.
- Review behavior: place a dynamic membership-tier bonus row directly beneath `Credit to add`, displaying the tier, percentage, and credited USD amount when the business contract supplies them. Include that bonus in the projected post-top-up balance, but not in the purchased amount or payable amount. RMB remains visible only in the final confirmation button.

## Orders

- Status: approved on 2026-08-11
- Reference: `orders-approved-dark-v1.png`
- Light reference: `orders-approved-light-v1.png`
- Viewport: 1920 × 1080, dark theme
- Current direction: use the high-density Audit Ledger with one compact status control, refresh action, a stable six-column transaction table, contextual row actions, and compact pagination.
- Contract constraint: preserve `/payment/orders/my`, cancellation, refund-request, and refund-eligible-provider semantics. Pending orders may be cancelled; only eligible completed orders may request refunds; read-only rows do not fabricate actions.
- Table language: columns remain Order number, Amount, Payment method, Status, Date, and Actions. Do not add an order-type column, unsupported search/date/export controls, dashboard KPI cards, or administrator/provider fields. Use monospaced order numbers, right-aligned currency, recognizable payment marks, and status labels paired with color.

## Redeem

- Status: approved on 2026-08-11
- Reference: `redeem-approved-dark-v1.png`
- Light reference: `redeem-approved-light-v1.png`
- Viewport: 1920 × 1080, dark theme
- Current direction: use the activity-first Redemption Workspace. Keep a full-width account summary, then an asymmetric left redemption dock and dominant right-side chronological activity timeline.
- Contract constraint: preserve the existing redemption request and history semantics. Codes may add balance, concurrency, subscription access, or trial benefits; successful redemption may return a signed value, message, new balance, and/or new concurrency. History must also represent administrator balance and concurrency adjustments without inventing unsupported controls.
- Interaction language: the left dock contains the code field, one primary redemption action, single-use/immediate-application guidance, the four benefit types, support access, and the approved gift artwork. The activity surface presents timestamp, code, event description, optional group context, and signed benefit with labels and icons rather than color alone.

## Affiliate

- Status: approved on 2026-08-11
- Reference: `affiliate-approved-dark-v1.png`
- Light reference: `affiliate-approved-light-v1.png`
- Viewport: 1920 × 1080, dark theme
- Current direction: use the earnings-first Rebate Treasury. A tall left settlement rail emphasizes cleared rebate and the transfer-all action; the right side pairs a compact share workflow with the invited-user ledger.
- Contract constraint: preserve `/user/aff` and `/user/aff/transfer` semantics. Display only invited count, available rebate, frozen/pending rebate, lifetime rebate, effective rebate percentage, invite code/link, and invitee email, username, join date, and lifetime rebate. Transfer always moves the full available rebate into account balance.
- Interaction language: code and link keep immediately adjacent copy actions; the transfer control has no amount input. Do not add charts, trends, tiers, conversion metrics, payout accounts, cash withdrawal, partial transfer, transfer history, invite statuses, rankings, campaigns, social-share actions, or administrator fields.

## Image Studio

- Status: approved on 2026-08-11
- Reference: `image-studio-approved-dark-v2.png` (`image-studio-approved-dark-v1.png` is superseded for the global shell and visible page name)
- Light reference: `image-studio-approved-light-v2.png` (`image-studio-approved-light-v1.png` is superseded for the global shell and visible page name)
- Viewport: 1920 × 1080, dark theme
- Current direction: use the result-first Canvas Workbench. The left side gives the current generated result most of the workspace, with submitted prompt/reference context and a compact in-memory session rail; the right side is a fixed next-iteration workbench containing key, model, quality, count, aspect, references, prompt, recent results, and the generation action.
- Contract constraint: preserve eligible-key filtering, OpenAI/Gemini/Antigravity platform presets, recommended models, 1K/2K/4K, supported count/aspect values, PNG/JPEG/WebP reference validation, up to 16 references, file selection and image paste, current-session iteration, pending/error states, latest-three-result reuse, preview, download, and continue-editing behavior.
- Session language: submitted reference thumbnails remain attached to their user turn; the current-session rail is never presented as persistent history. Keep the discard-on-leave warning visible and do not add project saving, folders, templates, style libraries, generation credits/cost, queues, seeds, negative prompts, layer/mask editors, social publishing, favorites, or administrator fields.

## Image API Docs

- Status: approved on 2026-08-11
- Reference: `image-api-docs-approved-dark-v2.png` (`image-api-docs-approved-dark-v1.png` is superseded for the global shell)
- Light reference: `image-api-docs-approved-light-v2.png` (`image-api-docs-approved-light-v1.png` is superseded for the global shell)
- Viewport: 1920 × 1080, dark theme
- Current direction: use the task-first Integration Runbook. Keep one prominent mutually exclusive Generate/Edit switch, then lead developers through Endpoint & authentication, Build the request, and Handle the response as one connected three-stage workflow. Supporting parameter, resolution/consumption, and error references remain compact beneath the primary flow.
- Contract constraint: Generate mode documents `POST /v1/images/generations` with JSON, `gpt-image-2`, `prompt`, `size`, and optional `n`; Edit mode documents `POST /v1/images/edits` with `multipart/form-data`, repeated `image[]` fields for one to 16 references, optional `size`, `n`, and supported `mask`. The two protocol modes never mix their overview, navigation, authentication, parameters, examples, response, or error content.
- Interaction language: provide immediately adjacent copy actions and mutually exclusive cURL, Python, and JavaScript example tabs, but never add a fake request runner, API-key input, live response console, execution state, or unsupported endpoint. Responses may document URL and `b64_json`; errors cover the existing 400, 401, 429, and 500/502/504 semantics.

## Profile & Security

- Status: approved on 2026-08-11
- Reference: `profile-security-approved-dark-v1.png`
- Light reference: `profile-security-approved-light-v1.png`
- Viewport: 1920 × 1080, dark theme
- Current direction: use the Identity & Trust Hub. Keep a permanent left identity/profile rail and a spacious right trust workspace containing account protection, sign-in methods, password changes, and conditional balance-notification controls.
- Contract constraint: preserve display-name and avatar URL/local-upload behavior, browser-side avatar preparation, dynamic Email/LinuxDo/DingTalk/OIDC/WeChat binding states and permitted bind/unbind actions, password validation, TOTP status/setup/enable/disable verification flow, and feature-gated balance threshold plus verified notification-email management.
- Interaction language: Profile remains accessible from the top-right account menu and is not added to the sidebar. Do not invent session/device history, passkeys, recovery codes, phone numbers, account deletion, login/audit history, password-change timestamps, security scores, or administrator fields.

## Subscriptions

- Status: approved on 2026-08-11
- Reference: `subscriptions-approved-dark-v3.png` (`v1` and `v2` are superseded)
- Light reference: `subscriptions-approved-light-v1.png`
- Viewport: 1920 × 1080, dark theme
- Current direction: use the Comparative Quota Ledger. Present all subscriptions in one full-width stable ledger with Plan, Status, Expires, Rate, Daily, Weekly, Monthly, and Action columns; each quota cell exposes used/limit, percent, progress, and reset countdown without hover.
- Global-shell revision: the selected option 2 layout now uses the approved option 1/3 WayX brand lockup with its rounded-square collapse control immediately to the right, and no longer contains a bottom `Collapse sidebar` row. This is part of the approved `v3` image and is not an exception to the global sidebar rule.
- Contract constraint: preserve `/subscriptions`, `/subscriptions/progress`, and `/subscriptions/summary` user semantics: multiple subscriptions; group/platform identity and description; active/expired/revoked/suspended status; expiry or no-expiration; billing multiplier; daily/weekly/monthly used, limit, remaining/percentage, reset timing; unlimited/window-not-active states; active-count and total-used summary. Renew routes only to existing `/purchase?tab=subscription&group=…` when payment and group eligibility allow.
- Interaction language: Subscriptions remains sidebar-hidden and can surface through the existing active-subscription header pill/direct route. Do not add cancel, pause, upgrade/downgrade, auto-renew, price, next charge, invoice, receipt, payment method, trial, assignment, user/group IDs, provider-account data, or administrator actions.
