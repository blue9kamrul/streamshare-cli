# StreamShare

A tiny pure-Node.js CLI to serve local files over HTTP  zero dependencies.

## What It Does

- Serves files over HTTP from your machine so other devices can download them.
- Lightweight, zero external libraries; implemented in `index.js`.
- Auto-opens the browser and prints Local and Network URLs.

## New Features

- **Multiple Files**: Pass many file paths to share multiple files at once. Example:

  `streamshare start file1.mp4 file2.pdf "My Doc.docx"`

  The landing page lists each file with an individual download link.

- **QR Code**: The server generates a QR code pointing to the network URL so other devices can scan and open the page without typing the address.

- **Port Rotation**: If the default port (3000) is occupied, the app will try successive ports (3001, 3002, ...) until it finds a free one.

- **Per-file streaming**: Each listed file is streamed individually with correct MIME type and Content-Disposition.

- **Progress & Logging**: Server console shows per-download progress and logs remote addresses and timestamps.

## Existing / Retained Behavior

- Landing page with download button and file metadata (size, name).
- Auto-open browser on start (can be disabled with `--no-open`).
- Streams files using `fs.createReadStream` (memory-efficient).
- Prints Local (`http://localhost:<port>`) and Network (`http://<local-ip>:<port>`) URLs.

## Usage

Start sharing one or more files:

```
streamshare start <file> [more-files...]
```

Options (examples  implement flags in CLI if available):

- `--port <n>`: prefer a specific starting port (defaults to 3000)
- `--no-open`: don't open the browser automatically
- `--quiet`: reduce console output

## Notes & Recommendations

- QR code requires a device with a camera/display to scan; scanning opens the network URL on the scanning device.
- When sharing over a LAN, verify your firewall/router allows inbound connections on the chosen port.
- For large files and better UX, resumable downloads (HTTP Range) are recommended; consider enabling Range support per-file.
- Filenames should be escaped/encoded in the UI to avoid XSS issues.

## Files

- Primary entry: `index.js`  updated to support multiple files, QR generation, and port rotation.

## Example

Share two files and disable auto-open:

```
streamshare start file1.mp4 file2.zip --no-open
```

