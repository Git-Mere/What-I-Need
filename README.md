# What I Need

A right-edge toolbox for everyday web browsing — open a Galaxy-style side toolbar and use lightweight helper tools right on top of the page you're viewing, without opening new tabs.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4.svg)

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/what-i-need/ljhkpkjdkaoecipdodlfajgpgnoedfbk)**

## Highlights

- Manifest V3 extension in TypeScript with 5 in-page tools on a draggable side rail, built with Vite and Preact
- The whole UI lives in a Shadow DOM, so host-page CSS cannot restyle it
- Only a small vanilla TypeScript rail is injected on every page; the Preact panel loads through a dynamic `import()` on first open
- Multi-term search on the CSS Custom Highlight API paints up to 10 color-coded terms without touching page text nodes
- English and Korean ship from one build through `chrome.i18n`

## Features

- **Multi-search** — find several keywords at once, each highlighted in its own color.
- **Brush** — draw and mark freely over any page.
- **Memo** — a quick scratchpad for jotting things down while you read.
- **Calculator** — do quick math without leaving the page.
- **Marker** — save scroll positions and jump back to them in one click.

The toolbar can be dragged to any vertical position and ships with full English and Korean localization.

## Demo

<img width="640" height="400" alt="screenshot-help-1280x800-en" src="https://github.com/user-attachments/assets/bc081b16-489c-4da8-b07c-6db0ab82459e" />

## Built With

- **Vite** — fast dev server and build tooling; pairs cleanly with the CRXjs plugin for extension bundling.
- **@crxjs/vite-plugin** — generates a valid Manifest V3 bundle (service worker, content scripts, web-accessible chunks) straight from the Vite build.
- **TypeScript** — static typing across content scripts, storage, and the feature registry to catch integration mistakes at compile time.
- **Preact** — renders the panel and tool UIs with a tiny runtime footprint, keeping the injected bundle light on host pages.
- **chrome.i18n + `_locales`** — locale-aware UI (en/ko) selected automatically from the browser language, so the same build works for both audiences.
- **sharp** — rasterizes the source SVG into the transparent 16/48/128 PNG icons required by the Chrome Web Store.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended) and npm
- Google Chrome (or any Chromium-based browser that supports Manifest V3)

### Installation

```sh
git clone https://github.com/Git-Mere/What-I-Need.git
cd What-I-Need
npm install
```

### Build

```sh
npm run build      # outputs the extension to dist/
npm run typecheck  # tsc --noEmit
npm run dev        # Vite dev server with HMR
```

### Load the extension in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated `dist/` directory.

A thin rail appears on the right edge of every page. Click it to reveal the tool buttons.

## What I Learned

**Rendering UI on arbitrary sites without style collisions.**
Problem: a toolbar injected into any web page inherits and leaks CSS with the host, so styles break unpredictably from site to site. Approach: the entire UI is mounted inside a single Shadow DOM root (`shadow-root.ts`), with one stylesheet scoped to that root and shared between the rail and the expanded panel; injected icons are inline SVG driven by `currentColor` so they inherit the theme instead of hard-coded fills. Result: the rail, panel, and help badges all render consistently under one style scope regardless of the host page's own CSS.

**Shipping one build for two languages.**
Problem: UI strings were originally hard-coded and mixed Korean and English across the codebase, which does not scale to a store listing in multiple locales. Approach: every string moved to `chrome.i18n` with `_locales/en` and `_locales/ko` message catalogs and a shared `t()` helper (`shared/i18n.ts`), with `default_locale` set to `en` as the global fallback. Dynamic strings that need inline emphasis are split into separate keys rather than fragile `{token}` placeholders, keeping translations safe to edit. Result: the extension follows the browser's UI language automatically from a single build, and both locales stay at key parity.

**Persisting state safely across independent tools.**
Problem: several features (brush settings, rail position, memo, calculator history) read and write local storage independently, so concurrent updates could clobber each other, and corrupted or outdated stored values could flow straight into the UI. Approach: writes go through a serialized `updateSettings` path (`settings-store.ts`) to avoid read-modify-write races, and stored values are validated and clamped per key before use. Result: settings survive reloads without one tool's write erasing another's, and malformed data no longer breaks rendering.

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.
