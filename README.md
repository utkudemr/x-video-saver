# X Video Saver

A small Manifest V3 extension for Brave and Chromium browsers. It detects direct MP4 variants attached to the currently open, publicly accessible X post and offers the available resolutions as download buttons.

## Features

- Lists real MP4 variants reported by X, ordered by bitrate.
- Downloads the chosen MP4 with the post ID in the filename.
- Supports both `fetch` and `XMLHttpRequest` X API responses.
- Keeps only video metadata in the active tab; no external service, account credentials, or cookie export.
- Rejects non-HTTPS and non-`video.twimg.com` download URLs.

## Install in Brave

1. Open `brave://extensions` and turn on **Developer mode**.
2. Choose **Load unpacked** and select the project folder containing `manifest.json`.
3. Open an X post with a video and reload the page after installing the extension.
4. Let the post load (play the video if necessary), open the extension, and choose a resolution.
5. Confirm the resulting file in Brave Downloads.

The extension requests `downloads` and `activeTab`, plus access to X pages and `video.twimg.com`. Review those permissions before installing.

## Security boundary

The page-world observer and isolated extension bridge exchange metadata through `window.postMessage`. Page scripts can forge same-origin messages; the bridge still restricts accepted URLs to HTTPS MP4 files on `video.twimg.com` and only displays variants associated with the open post, but it cannot cryptographically prove which page script sent a message. Downloads require an explicit click. Use the extension only on X pages you trust.

## Development and tests

Requires Node.js 18+; there are no npm dependencies.

```sh
node --test test/*.test.js
```

Tests cover variant extraction, URL validation, the page observer's fetch/XHR hooks, tab-scoped message handling, and the download action.

## Limitations

- Direct MP4 only. HLS playlist merging, DRM bypass, private posts, and inaccessible media are not supported.
- X can change its internal API at any time; future changes may require updates.
- The labels reflect the resolution of the source MP4 variants; they do not upscale the video.

## Verification

The example post used during development exposed 320×320, 540×540, 720×720, and 1080×1080 MP4 variants. The 1080×1080 option was downloaded and inspected locally: it contained H.264 video and AAC audio in an MP4 container. Automated tests pass with `node --test test/*.test.js`.

Use this extension only for media you have the right to download, and follow X's terms and applicable copyright law.
