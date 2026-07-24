
# AWS Workshop Studio Crawler

This project automates exporting AWS Workshop Studio pages using Playwright. It reads a list of URLs from `urls.txt`, opens each page in Chromium, waits for it to fully render, and exports it — either as a PDF or as Markdown. URLs are processed in batches to improve performance while avoiding excessive memory usage.

There are **three scripts**, because workshops fall into two categories (public vs. login-required) and PDF export has a limitation that Markdown export fixes:

| Script | Login required? | Output | Browser used |
| --- | --- | --- | --- |
| `print-public.js` | No | PDF | Fresh headless Chromium (no cookies) |
| `print-authenticated.js` | Yes | PDF | Your real Chrome, attached over CDP |
| `crawl-markdown.js` | Yes | Markdown | Your real Chrome, attached over CDP |

See [Which script do I use?](#which-script-do-i-use) to pick the right one.

---

## Features

* Read URLs from a text file
* Automatically generate output filenames from the URL path
* Process multiple pages concurrently (batch size configurable per script)
* Wait for page rendering before exporting
* Continue processing even if a page fails
* Display progress and timing information
* Export authenticated (login-required) workshop pages by reusing your real, already-logged-in Chrome session
* Export full page content as Markdown, avoiding the code-block truncation that print/PDF export has

---

## Requirements

* Node.js 18 or later (Node.js 22+ recommended)
* npm
* Google Chrome installed (only needed for `print-authenticated.js` / `crawl-markdown.js`)

---

## Installation

Clone or download this project.

Initialize the project if necessary:

```bash
npm init -y
```

Install dependencies (Playwright, plus Turndown for Markdown export):

```bash
npm install
```

Install the Chromium browser used by Playwright:

```bash
npx playwright install chromium
```

---

## Which script do I use?

**`print-public.js`** — the workshop page loads without signing in (a normal public catalog link). Simplest option: runs a disposable headless browser, no setup beyond `npm install`.

**`print-authenticated.js`** — the workshop requires login (an event dashboard URL, a private catalog link, content behind AWS SSO/Cognito, etc.) and `print-public.js` gets stuck on a login wall. This script attaches to your **real, already-running Chrome** over the DevTools Protocol (CDP), so it reuses your live session cookies instead of a blank one. Requires a one-time Chrome setup — see [Authenticated Workshops](#authenticated-workshops-print-authenticatedjs).

**`crawl-markdown.js`** — same login-required workshops as above, but exporting to Markdown instead of PDF. Use this when a workshop page has code blocks that scroll horizontally: PDF/print export only captures what's visible on the printed page width, silently cutting off any code that requires horizontal scrolling. Markdown export reads the full page DOM directly, so no code content is lost. See [Markdown Export](#markdown-export-crawl-markdownjs).

---

## Project Structure

```text
.
├── get-url-path.js
├── print-public.js
├── print-authenticated.js
├── crawl-markdown.js
├── urls.txt
├── package.json
├── package-lock.json
└── node_modules/
└── output/
```

---

## URLs File

Create a file named `urls.txt`.

Each line should contain one URL.

Example:

```text
https://catalog.workshops.aws/observability/en-US/aws-native
https://catalog.workshops.aws/observability/en-US/aws-native/logs
https://catalog.workshops.aws/observability/en-US/aws-native/logs/setup
https://catalog.workshops.aws/observability/en-US/aws-native/logs/setup/cloudwatchlogs
```

All three scripts read from the same `urls.txt`.

---

## Generate `urls.txt` from the Workshop Navigation

If you don't already have a list of URLs, you can extract them directly from the workshop navigation using your browser's Developer Tools.

### Steps

1. Open the workshop home page.
2. Press **F12** (or **Ctrl + Shift + I**) to open Developer Tools.
3. Open the **Console** tab.
4. Paste the following script and press **Enter**.

```javascript
const elementName = process.env.ELEMENT_NAME || 'my-class'; // Default class name if not provided

// 1. Select all elements with the specified class name
const elements = document.querySelectorAll(`.${elementName}`);

// 2. Extract all href values
const allText = Array.from(elements)
  .map(element => element.href)
  .join("\n");

// 3. Print the URLs
console.log(allText);
```

### Customize the CSS Class

Replace `my-class` with the class name used by the workshop navigation links.

Example:

```javascript
const elementName = 'awsui_link_l0dv0_1pmbv_400';
```

### Example Output

```text
https://catalog.workshops.aws/observability/en-US/aws-native
https://catalog.workshops.aws/observability/en-US/aws-native/logs
https://catalog.workshops.aws/observability/en-US/aws-native/logs/setup
https://catalog.workshops.aws/observability/en-US/aws-native/logs/setup/cloudwatchlogs
```

Copy the output and save it as `urls.txt` (one URL per line) in the project directory before running any of the scripts.

## Output Filename

Every script extracts the path after `/en-US/` and replaces `/` with `_`. PDF scripts write `.pdf`, `crawl-markdown.js` writes `.md`.

Example:

| URL                                              | Output (PDF scripts)                       | Output (`crawl-markdown.js`)              |
| ------------------------------------------------ | ------------------------------------------ | ------------------------------------------ |
| `.../en-US/aws-native`                           | `aws-native.pdf`                           | `aws-native.md`                           |
| `.../en-US/aws-native/logs`                      | `aws-native_logs.pdf`                      | `aws-native_logs.md`                      |
| `.../en-US/aws-native/logs/setup`                | `aws-native_logs_setup.pdf`                | `aws-native_logs_setup.md`                |
| `.../en-US/aws-native/logs/setup/cloudwatchlogs` | `aws-native_logs_setup_cloudwatchlogs.pdf` | `aws-native_logs_setup_cloudwatchlogs.md` |

---

## Public Workshops (`print-public.js`)

For workshop pages that don't require signing in.

### Configuration

Open `print-public.js` and adjust the configuration section.

```javascript
const OUTPUT_DIR = "./output";
const URL_FILE = "urls.txt";

const BATCH_SIZE = 10;
const WAIT_AFTER_LOAD = 5000;
```

* **`OUTPUT_DIR`** — directory where generated PDFs are saved.
* **`URL_FILE`** — input file containing the list of URLs (default `"urls.txt"`).
* **`BATCH_SIZE`** — number of pages processed simultaneously. This runs a disposable headless browser, so it's safe to raise this if your machine has the CPU/memory to spare, or lower it if Chromium consumes too much memory.
* **`WAIT_AFTER_LOAD`** — extra milliseconds to wait after the page reaches `networkidle`, for content that keeps rendering after network requests finish.

### Run

```bash
node print-public.js
```

---

## Authenticated Workshops (`print-authenticated.js`)

For workshop pages that require login — an event dashboard, a private catalog link, or anything behind AWS SSO/Cognito. A fresh headless browser has no session cookies and gets stuck on the login page, so this script attaches to your **real, already-running Chrome** over the DevTools Protocol (CDP) instead, reusing whatever session is already active there.

### One-time Chrome setup

Chrome refuses to enable remote debugging on its default profile directory (a security restriction to stop malware from silently attaching to your real session), so use a dedicated profile just for automation:

```bash
mkdir -p ~/.chrome-automation-profile
google-chrome --user-data-dir="$HOME/.chrome-automation-profile" --remote-debugging-port=9222
```

Log in to the workshop page in that window once. The session persists on disk in that profile directory, so future runs are already logged in — you don't need to repeat this setup unless the session expires. Leave the window open while the script runs; it opens new tabs there.

### Configuration

Open `print-authenticated.js` and adjust the configuration section.

```javascript
const OUTPUT_DIR = "./output";
const URL_FILE = "urls.txt";
const CDP_ENDPOINT = "http://localhost:9222";

const BATCH_SIZE = 3;
const WAIT_AFTER_LOAD = 10000;
```

* **`OUTPUT_DIR`** / **`URL_FILE`** — same as `print-public.js`.
* **`CDP_ENDPOINT`** — address of the Chrome instance to attach to. Change the port if you launched Chrome with a different `--remote-debugging-port`.
* **`BATCH_SIZE`** — kept low by default (3) because this drives real, visible browser tabs rather than a disposable headless one. Raising it opens more tabs at once in your actual window.
* **`WAIT_AFTER_LOAD`** — same purpose as `print-public.js`.

### Run

```bash
node print-authenticated.js
```

### Notes

* Each URL opens as a real tab in your Chrome window while the script runs — expect visible tab activity.
* PDF export uses the DevTools Protocol `Page.printToPDF` command directly (the same engine behind Ctrl+P → Save as PDF), since Playwright's `page.pdf()` helper only works in headless mode.
* The script never closes your Chrome — it only disconnects when finished.
* If your workshop session expires mid-run, remaining pages will fail with a login-related error; already-saved PDFs are unaffected. Re-run the one-time setup's login step and run the script again.

---

## Markdown Export (`crawl-markdown.js`)

### Why not just use the PDF?

Chrome's print engine (`page.pdf()` / `Page.printToPDF`) only captures what's visible on a printed page. Workshop code blocks often use `overflow-x: auto` so long lines scroll horizontally instead of wrapping — the printed/PDF output silently cuts that text off at the page width instead of scrolling into it. `crawl-markdown.js` sidesteps this entirely: instead of rendering a print layout, it reads the fully rendered page DOM directly (`page.content()`), which always contains every character regardless of how it displays visually, then converts that HTML to Markdown (via [Turndown](https://github.com/mixmark-io/turndown), with GitHub-flavored Markdown support for tables) so code blocks come through intact as fenced code blocks.

This uses the same authenticated-Chrome-over-CDP approach as `print-authenticated.js` — Ctrl+S "Save Page As" in a normal browser tab still requires the tab to already be logged in, and so does this script; it works because it reuses your already-logged-in session the same way `print-authenticated.js` does.

### One-time Chrome setup

Same as [Authenticated Workshops](#authenticated-workshops-print-authenticatedjs) — if you already have that Chrome window open, `crawl-markdown.js` reuses it.

### Configuration

Open `crawl-markdown.js` and adjust the configuration section.

```javascript
const OUTPUT_DIR = "./output";
const URL_FILE = "urls.txt";
const CDP_ENDPOINT = "http://localhost:9222";
const CONTENT_SELECTOR = null;

const BATCH_SIZE = 3;
const WAIT_AFTER_LOAD = 10000;
```

* **`OUTPUT_DIR`** / **`URL_FILE`** / **`CDP_ENDPOINT`** / **`BATCH_SIZE`** / **`WAIT_AFTER_LOAD`** — same as `print-authenticated.js`.
* **`CONTENT_SELECTOR`** — optional CSS selector for the page's main content container. Leave `null` to convert the entire page (simplest, but includes navigation/sidebar text in every output file). Find the right selector the same way you found `ELEMENT_NAME` for `get-url-path.js`: inspect the content area in DevTools and copy its class, e.g.:

  ```javascript
  const CONTENT_SELECTOR = ".awsui_content_l0dv0";
  ```

  If the selector isn't found on a page, the script logs a warning and falls back to converting the full page for that URL.

### Run

```bash
node crawl-markdown.js
```

---

## Configuration Reference

All three scripts share the same configuration shape, defined as constants at the top of each file (no CLI args, no config file):

| Constant | Meaning |
| --- | --- |
| `OUTPUT_DIR` | Directory where output files are saved |
| `URL_FILE` | Input file containing the list of URLs (default `"urls.txt"`) |
| `CDP_ENDPOINT` | *(authenticated scripts only)* Address of the Chrome instance to attach to |
| `CONTENT_SELECTOR` | *(`crawl-markdown.js` only)* Optional CSS selector to narrow conversion to the main content area |
| `BATCH_SIZE` | Number of pages processed simultaneously |
| `WAIT_AFTER_LOAD` | Extra milliseconds to wait after `networkidle`, for content that keeps rendering after network requests finish |

---

## Error Handling

If a page cannot be loaded or exported:

* The error is displayed in the console.
* The page is skipped.
* The remaining pages continue processing.

Example:

```text
❌ Failed: https://example.com/page
Timeout 60000ms exceeded.
```

---

## Notes

* `print-public.js` runs in **headless mode** — no visible browser window.
* `print-authenticated.js` and `crawl-markdown.js` drive your **real, visible Chrome** window over CDP — they never launch or close a browser themselves.
* Each batch opens at most `BATCH_SIZE` tabs/pages simultaneously.
* Existing output files with the same filename are overwritten.

---

## Customization Ideas

Possible future improvements include:

* Resume interrupted downloads
* Retry failed pages automatically
* Save failed URLs to a log file
* Generate a table of contents
* Merge all PDFs into a single document
* Use the page title as the filename
* Hide navigation bars or sidebars before printing
