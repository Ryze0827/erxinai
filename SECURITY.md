# WayX production security baseline

This repository contains the browser application. The controls below are the minimum release gate for a public consumer deployment; frontend checks are not a substitute for backend enforcement.

## Implemented in this repository

- Arbitrary custom-page embeds have been removed. Custom pages render allowlist-sanitized Markdown only; dedicated product pages use normal application routes.
- External requests and payment redirects require HTTPS, except same-origin or loopback addresses used for local development. Authenticated API requests reject HTTP redirects and disable browser caching.
- Authentication persistence follows the established application flow: login honors **Keep me signed in**, while registration and OAuth completion retain their existing persistent behavior. Token expiry comes from backend `expires_in`; the client adds no independent session lifetime.
- Payment recovery retains the established local-storage flow and honors provider-supplied `expires_at` when present; the client adds no independent recovery lifetime.
- Password-reset tokens are removed from the address bar synchronously after capture. New reset links should place the token in the URL fragment rather than the query string so it never reaches access logs. Existing client password checks are preserved, while the backend remains authoritative.
- Markdown HTML is allowlist-sanitized. URLs, images, and external links receive protocol checks and opener/referrer protection; embedded frames are not accepted.
- Image references accept only verified PNG, JPEG, and WebP signatures, with a 10 MB per-file and 50 MB per-session limit. Avatar source files are limited to 10 MB.
- Production builds do not require inline scripts, allowing a restrictive `script-src` policy. The Nginx baseline is in `deploy/nginx/`.

## Required backend release gates

1. **Session handling**
   - Prefer a short-lived access token plus a rotating refresh token in a `Secure; HttpOnly; SameSite=Lax` cookie. Revoke the token family after reuse, password change, logout, or account suspension.
   - If cookie authentication is accepted, validate `Origin` on every state-changing request and require a CSRF token. Never use GET for mutations.
   - Do not return access or refresh tokens in URLs, OAuth fragments, logs, analytics events, or error payloads.

2. **Authorization and input validation**
   - Check resource ownership on the server for every key, order, usage record, payment, redemption, profile, batch, and custom-page identifier. Never trust a user ID supplied by the browser.
   - Enforce field length, enum, numeric range, MIME type, decoded file signature, pixel count, and body-size limits on the server. Frontend limits are usability controls only.
   - Enforce password length and compromised-password checks on registration and reset endpoints. Store passwords with Argon2id or a current adaptive password hash.

3. **Abuse prevention**
   - Apply per-IP and per-account rate limits to login, registration, email/SMS code sending and verification, password reset, OAuth completion, redemption, payment creation, API-key creation, and image generation.
   - Turnstile tokens must be verified server-side with Siteverify, including expected hostname/action, expiry, and single-use behavior. Fail closed when validation is unavailable.
   - Add progressive delay or temporary account lockout for repeated password and 2FA failures without enabling account enumeration.

4. **Payments and webhooks**
   - Derive price, currency, credit, plan, and user ownership on the server. Never trust payable amounts or order status from the browser.
   - Verify Stripe, Airwallex, Alipay, and WeChat webhook signatures against the raw request body. Enforce replay windows and idempotency, and credit an order exactly once.
   - Allow only provider-specific HTTPS redirect domains on the server. Do not pass arbitrary return URLs through to providers.

5. **Network and data exposure**
   - CORS must allow only the production frontend origin, with explicit methods and headers. Never combine credentialed requests with `Access-Control-Allow-Origin: *`.
   - Keep the API same-origin behind the reverse proxy when possible. Configure the backend to trust forwarded headers only from the proxy address.
   - Redact `Authorization`, cookies, API keys, reset/OAuth tokens, payment secrets, request bodies, and sensitive query parameters from logs and error monitoring.
   - Return generic 5xx responses with a correlation ID; keep stack traces and database/provider messages server-side.

## Deployment

1. Build with `npm ci && npm run build` and serve only `dist/`. Never expose the Vite development or preview server to the internet.
2. Adapt `deploy/nginx/wayx.conf.example`, enable TLS, and include `deploy/nginx/security-headers.conf` on every SPA response. Test the configuration with `nginx -t` before reload.
3. Replace the broad `https:` entry in `connect-src` with exact production origins when the final API, image gateway, and payment providers are known.
4. Keep the CSP domains required by enabled integrations. Turnstile requires `https://challenges.cloudflare.com` in `script-src` and `frame-src`; Stripe and Airwallex require their documented checkout origins.
5. Run `npm audit` and secret scanning in CI, block critical/high production dependency findings, and rebuild container/server images from a pinned lockfile.
6. Put the origin behind a maintained WAF/CDN, enable DDoS protection and rate limiting, restrict administrative endpoints by separate authorization, and alert on authentication, payment, and API-key anomalies.

Useful primary references: [Cloudflare Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Cloudflare Turnstile CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/), and [Stripe integration security](https://docs.stripe.com/security/guide).
