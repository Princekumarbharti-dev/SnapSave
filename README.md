<div align="center">
  <img src="public/icons/icon-128.png" width="96" height="96" alt="SnapSave icon">
  <h1>SnapSave</h1>
  <p><strong>Capture anything. Save anywhere.</strong></p>
  <p>A fast, private, and polished Chrome extension for capturing webpages locally.</p>

  ![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
  ![Privacy](https://img.shields.io/badge/Privacy-Local_only-6C5CE7)
  ![License](https://img.shields.io/badge/License-MIT-22A06B)
</div>

## Overview

SnapSave captures the visible browser area, a selected region, or an entire scrolling webpage. Captures can be copied directly or downloaded as PNG, JPG, or a locally generated paginated PDF.

There are no accounts, analytics, advertisements, cloud uploads, or remote code. Screenshot processing stays inside the browser.

## Features

- Visible viewport screenshots
- Full-page scroll-and-stitch capture
- Drag-to-select area capture with live dimensions
- PNG and JPG export with configurable quality
- Multi-page PDF export generated locally
- One-click clipboard copy
- Clean URL-based filenames
- Chrome-managed keyboard shortcuts
- Automatic download preference
- Friendly handling for restricted Chrome pages and capture limits

## Screenshots
<img width="436" height="439" alt="image" src="https://github.com/user-attachments/assets/1c289864-7a0a-41a6-a951-481352822f0f" />


## Install locally

### Requirements

- Node.js 20 or newer
- Google Chrome

```bash
npm install
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the generated `dist` folder.
5. Pin SnapSave and open it on any normal webpage.

On Windows PowerShell, use `npm.cmd` if script execution blocks `npm.ps1`:

```powershell
npm.cmd run build
```

## Development

```bash
npm run dev      # Watch development build
npm run test     # Run utility tests
npm run build    # Type-check and create production build
npm run package  # Create the Chrome Web Store ZIP
```

The store-ready archive is generated at `release/snapsave-1.0.0.zip`.

## Architecture

```text
Popup UI
   â†“
Manifest V3 service worker
   â†“
Chrome capture and scripting APIs
   â†“
Temporary content-script selection/scroll controls
   â†“
Local Canvas stitching, conversion, clipboard, and download
```

| Area | Responsibility |
| --- | --- |
| `src/background` | Capture coordination, Chrome APIs, quota-safe scrolling and stitching |
| `src/content` | Temporary area selector and full-page scroll coordination |
| `src/popup` | Capture actions, preview, clipboard and export |
| `src/options` | Format, quality, filename, and download preferences |
| `src/utils` | Geometry, filenames, image conversion, and PDF generation |
| `tests` | Deterministic utility tests |

## Permissions

SnapSave deliberately avoids `<all_urls>`.

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Temporarily access the page only after the user starts a capture |
| `scripting` | Inject the temporary area selector and full-page scroll coordinator |
| `storage` | Save the extension's small set of preferences |
| `downloads` | Save user-requested PNG, JPG, and PDF files |
| `clipboardWrite` | Copy screenshots when requested |

## Privacy

SnapSave does not collect, retain, transmit, sell, or analyze browsing data or screenshots. Captures are processed locally and retained only in volatile extension memory until replaced or the service worker stops.

Read the full [Privacy Policy](PRIVACY.md).

## Browser limitations

Chrome blocks extensions from injecting into or capturing protected pages such as `chrome://` URLs and the Chrome Web Store. Extremely large pages may be proportionally reduced to stay within browser canvas limits.

## Testing

Automated tests cover filename sanitization, URL parsing, image formats, page dimensions, canvas limits, and full-page tile calculations.

For manual verification, test visible, selected-area, full-page, JPG/PNG, PDF, clipboard, scroll restoration, and error handling across normal, long, responsive, sticky-header, and lazy-loaded webpages.

## License

Licensed under the [MIT License](LICENSE).

