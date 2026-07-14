# Sentence AI Gateway Website Prototype

[简体中文](./README.zh-CN.md)

Sentence AI is a responsive website prototype for an AI gateway service. It presents a unified, OpenAI-compatible entry point for multiple model providers, together with request tracing, usage and cost visibility, provider health, and failover concepts.

This repository contains the public website, interactive gateway demonstrations, and a production-oriented authentication client compatible with the `sub2api` backend. Gateway demonstrations remain front-end-only.

## Features

- Responsive landing page for desktop and mobile devices
- Interactive AI gateway demonstrations
- OpenAI-compatible endpoint presentation
- Request tracing and latency visualization
- Token usage and cost monitoring concepts
- Provider health and automatic failover concepts
- Password, email verification, 2FA, password recovery, and OAuth authentication flows
- Interactive pricing, FAQ, and navigation interfaces
- Locally bundled fonts and images

## Current Scope

The project combines a static gateway prototype with a real authentication client:

- Authentication uses the backend at `/api/v1`, including session refresh and OAuth pending-session cookies.
- Gateway dashboards display demonstration data and do not call a backend API.
- A compatible backend and its database/provider configuration are required for live authentication.

## Technology

- React 19
- Vite 6
- React Router
- React Markdown
- JavaScript and CSS

## Local Development

Node.js 20 or later is recommended. Node.js 22 is supported by the current project setup.

```bash
npm install
npm run dev
```

The development server listens on all local interfaces and proxies `/api` to `http://127.0.0.1:8080` by default.

Optional environment variables:

```bash
VITE_API_BASE_URL=/api/v1
VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:8080
VITE_DASHBOARD_URL=/dashboard
```

## Available Scripts

```bash
npm run dev      # Start the Vite development server
npm run build    # Create a production build in dist/
npm run preview  # Preview the production build locally
```

## Project Structure

```text
.
├── index.html                       # Vite HTML entry and page metadata
├── src/
│   ├── App.jsx                      # Landing page behavior and application routes
│   ├── api/                         # API client, authentication endpoints, and token storage
│   ├── auth/                        # Authentication pages, controls, and OAuth state machine
│   ├── gatewayDemos.js              # Interactive AI gateway demonstrations
│   ├── landing-page.html            # Main landing-page markup
│   └── *.css                        # Page and component styles
├── public/assets/                   # Local fonts and images
└── vite.config.mjs                  # Vite configuration
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Main Sentence AI gateway landing page |
| `/login`, `/register`, `/email-verify` | Password registration and sign-in flows |
| `/forgot-password`, `/reset-password` | Password recovery |
| `/auth/success` | Unified authentication result page |
| `/auth/*/callback` | OAuth callbacks and account-completion flows |

Client-side route selection is handled by the React application. Cloudflare Pages can serve these routes through its default single-page application fallback because the build does not include a top-level `404.html` file.

## Deploying to Cloudflare Pages

Use the following build settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | `React (Vite)` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Leave empty |

Production should keep `/api/v1` on the same origin. Configure the backend `server.frontend_url`, every enabled OAuth callback/frontend redirect, and SPA fallback for all authentication routes.

## Before Production

- Connect the gateway views to production request, usage, billing, and provider-health data.
- Confirm final pricing and FAQ content, then add Sentence AI legal and contact pages when available.
- Add social preview metadata and verify the production domain.
- Add appropriate security headers and secret management when backend integrations are introduced.
