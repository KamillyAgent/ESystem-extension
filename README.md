# ESystem — Browser Extension

Cross-browser content blocker for NSFW / adult / 18+ pages and domains.
Works on Chrome, Brave, and Firefox (MV3).

> **Status:** v0.1.0 — local load-unpacked only. No store submission.

## What it does

- **Detects NSFW content** in real time (URL keywords + page metadata + text patterns + DOM mutations)
- **Reports findings** to your own ESystem backend (per-user, isolated)
- **Redirects** blocked pages to a clean block screen on your backend
- **Syncs** your blocklist + custom words across devices every 6h

## Files

```
extension/
├── manifest.json                 # Chrome + Brave (MV3 service worker)
├── manifest.firefox.json         # Firefox variant (background scripts)
├── icons/                        # 16, 48, 128 PNG
├── src/
│   ├── background/background.js  # service worker — sync, navigation blocking
│   ├── content/content.js        # detection + MutationObserver
│   ├── popup/                    # toolbar popup
│   ├── options/                  # settings page (URL + API key)
│   ├── shared/
│   │   ├── api.js                # fetch wrapper for backend
│   │   ├── blocking.js           # tabs.update() redirect
│   │   ├── detector.js           # URL + metadata + text scanning
│   │   ├── patterns.js           # built-in URL + text keywords
│   │   └── storage.js            # chrome.storage.local wrapper
│   └── vendor/
│       └── browser-polyfill.min.js  # Mozilla webextension-polyfill
└── build/                        # `npm run build:all` output
```

## Install (load unpacked)

### Chrome / Brave

1. Run `npm run build:chrome` (or just zip src yourself)
2. Open `chrome://extensions` (or `brave://extensions`)
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `extension/` folder (or `build/chrome/` if you ran the build)

### Firefox

1. Run `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on...** → select `build/firefox/manifest.firefox.json`

## Build

```bash
npm install
npm run build:all      # writes build/{chrome,firefox}/
npm run zip:chrome     # writes build/esystem-chrome-v0.1.0.zip
npm run zip:firefox    # writes build/esystem-firefox-v0.1.0.zip
```

The build script copies `src/`, `icons/`, picks the right manifest, and produces a zip
ready to distribute (load unpacked or for personal use).

## Configuration

After loading the extension:

1. Sign in at your ESystem backend (e.g. https://esystem.masud.app)
2. Generate an API key on the dashboard
3. Click the ESystem icon → **Settings**
4. Paste backend URL + API key → **Save & verify**
5. Click **Sync now** to pull your blocklist

Done. Browse — the extension will detect, report, and block.

## Spec

See `../SPEC.md` in the parent project folder for the full architecture spec.
