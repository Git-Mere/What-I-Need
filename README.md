# What I Need

What I Need (WID) is a Manifest V3 Chrome extension scaffold. Phase 1 includes the Vite + TypeScript + CRXjs build setup, a background service worker stub, and a lightweight Shadow DOM rail stub injected on web pages.

## Install

```sh
npm install
```

## Build

```sh
npm run build
```

The build output is written to `dist/`.

## Typecheck

```sh
npm run typecheck
```

## Load Unpacked In Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the generated `dist/` directory.

The extension injects a thin rail on the right edge of pages. Click the rail to reveal placeholder tool buttons.
