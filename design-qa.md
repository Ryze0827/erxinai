# Design QA — Console smoke-glass themes

## Scope

- The supplied task-management reference remains the visual source of truth for console-owned surfaces.
- The public homepage and login/register flows are explicitly excluded from the smoke-glass override and retain their original Sentence AI styling.
- Console-owned surfaces support persisted dark, light, and system preferences.

## Evidence

- Dark console comparison: `.design-qa/console-preview-1536x908.png`
- Source/reference comparison: `.design-qa/side-by-side.png`
- Restored homepage: `.design-qa/home-reverted.png`
- Restored login page: `.design-qa/login-reverted.png`
- Dark public console surface: `.design-qa/key-usage-dark.png`
- Light public console surface: `.design-qa/key-usage-light.png`
- Light mobile console surface: `.design-qa/key-usage-light-mobile.png`

## Verification

- Homepage: white original canvas, transparent original navigation, and no console root or smoke-glass selector match.
- Login/register: original fluted blue-green scene, translucent light authentication card, dark text, and no console root.
- Dark console: near-black canvas, smoke surfaces, metallic hairlines, restrained highlights, and fluorescent green actions.
- Light console: translucent white-green surfaces, light specular edges, green-gray metallic borders, readable dark typography, and matching fluorescent green actions.
- Theme control: verified `dark → system → light`; light state persisted after reload.
- Mobile light mode: verified at `390 × 844`; no horizontal overflow and the key field/action stack remains full-width and readable.
- Runtime: no browser errors or warnings on the final light console surface.
- Build: `npm run build` passed.

## Findings

- No remaining P0, P1, or P2 visual issues in the requested scope.
- The authentication settings request still shows its existing handled error state while the separate backend is unavailable; this does not affect the theme rollback.

final result: passed
