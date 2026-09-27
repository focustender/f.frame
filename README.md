# f.frame

Frame a photo, video, or GIF to the 8 media aspect ratios in the FocusTender
`Module / Media` design system component, and export web-optimized files
ready to drop into a page.

- **Ratios:** 21:9, 16:9, 3:2, 4:3, 1:1, 4:5, 3:4, 9:16
- **Crop:** fill-to-cover, drag inside any card to reposition, per ratio
- **Export:** pick any number of ratios at once
  - Photo/HEIC → `.avif` + `.webp`
  - Video → `.mp4` (H.264, faststart) + `.webm` (AV1) + a poster `.webp`
  - GIF → muted looping `.mp4` + `.webm` + poster (far smaller than a GIF on the web)

## Requirements

- macOS, Node 18+
- [Homebrew](https://brew.sh) `ffmpeg` (`brew install ffmpeg`) — resolved from
  `/opt/homebrew/bin` or `/usr/local/bin`
- The Vanilla Grotesque Display/Text font files, licensed and not included in
  this repo. Copy them into `src/assets/fonts/`:
  - `VanillaGrotesqueDisplay-570.otf`
  - `VanillaGrotesqueText-450.otf`
  - `VanillaGrotesqueText-460.otf`

## Develop

```sh
npm install
npm run dev
```

The Vite dev server runs on port 5183.

## Test

```sh
npm test
```

Runs the crop-math unit tests (`electron/media/crop.test.ts`).

## Build

```sh
npm run build
npm start
```

## Package as a desktop app

```sh
npm run dist
```

Produces `release/f.frame-<version>-arm64.dmg`. Open it and drag f.frame into
Applications. The app is ad-hoc signed (no paid Apple Developer ID), which is
enough to run locally on this Mac — macOS Gatekeeper may still show an
"unidentified developer" prompt the first time you open it from
Applications; right-click → Open once to clear it.

`npm run package` builds an unpacked `.app` in `release/mac-arm64/` for a
quick check without producing a `.dmg`.

## Status

MVP. Not yet packaged/signed as a distributable `.app`; run from source.
Post-MVP ideas: zoom inside the crop, multi-width srcset export, pad/letterbox
mode, video trimming, batch export, bundled ffmpeg, code signing.
