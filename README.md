# Sentence AI Gateway Website Prototype

[简体中文](./README.zh-CN.md)

Sentence AI is a responsive website prototype for an AI gateway service. It presents a unified, OpenAI-compatible entry point for multiple model providers, together with request tracing, usage and cost visibility, provider health, and failover concepts.

This repository currently contains the public website and interactive front-end demonstrations only. It does not yet proxy real AI requests or provide a production authentication system.

## Features

- Responsive landing page for desktop and mobile devices
- Interactive AI gateway demonstrations
- OpenAI-compatible endpoint presentation
- Request tracing and latency visualization
- Token usage and cost monitoring concepts
- Provider health and automatic failover concepts
- Login and registration page prototypes
- Interactive pricing, FAQ, and navigation interfaces
- Locally bundled fonts and images

## Current Scope

The project is a static front-end prototype:

- Login and registration submissions are simulated in the browser.
- Gateway dashboards display demonstration data and do not call a backend API.
- No API keys, environment variables, database, or server runtime are required.

## Technology

- React 19
- Vite 6
- JavaScript and CSS

## Local Development

Node.js 20 or later is recommended. Node.js 22 is supported by the current project setup.

```bash
npm install
npm run dev
```

The development server listens on all local interfaces by default. Use the address printed by Vite after startup.

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
│   ├── App.jsx                      # Main page behavior and route selection
│   ├── AuthPage.jsx                 # Login and registration prototypes
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
| `/login` | Simulated login page |
| `/register` | Simulated registration page |

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

No environment variables are required for the current prototype.

## Before Production

- Connect login and registration to real backend services.
- Connect the gateway views to production request, usage, billing, and provider-health data.
- Confirm final pricing and FAQ content, then add Sentence AI legal and contact pages when available.
- Add social preview metadata and verify the production domain.
- Add appropriate security headers and secret management when backend integrations are introduced.
