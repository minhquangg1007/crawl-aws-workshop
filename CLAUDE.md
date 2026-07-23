# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small standalone Node.js script (not a full application) that batch-downloads AWS Workshop Studio pages as PDFs using Playwright/Chromium. There is no build system, test suite, or linter — `npm test` is the default placeholder and always fails.

## Setup & commands

```bash
npm install                    # installs the single dependency: playwright
npx playwright install chromium  # required once — downloads the Chromium binary Playwright drives
node print.js                  # runs the crawler/PDF export
```

There is no watch mode, lint step, or automated test to run after changes — verify changes by running `node print.js` against a small `urls.txt` and checking the generated PDFs in the output directory.

## Architecture / data flow

1. **`get-url-path.js`** is *not* run with Node — it's a snippet pasted into the browser DevTools console on a workshop's navigation page. It queries all elements matching a CSS class (`ELEMENT_NAME` env var, default `my-class`) and prints their `href` values. The user copies that output into `urls.txt` (one URL per line).
2. **`urls.txt`** is the input file (gitignored, user-generated per workshop — not meant to be checked into version control despite currently being present/modified in the working tree).
3. **`print.js`** is the main script:
   - Reads and trims/filters non-empty lines from `urls.txt`.
   - Launches one headless Chromium browser instance for the whole run.
   - Processes URLs in sequential batches of `BATCH_SIZE` (default 10), opening up to that many pages concurrently per batch via `Promise.all` — this bounds memory/CPU use compared to opening all pages at once.
   - For each URL: navigates with `waitUntil: "networkidle"` (60s timeout), waits an extra `WAIT_AFTER_LOAD` ms (default 10000) for late client-side rendering, then calls `page.pdf()` and closes the page.
   - Per-page failures are caught and logged (`❌ Failed: ...`) without aborting the batch or the run.
   - Output filename is derived from the URL path: everything after `/en-US/` with `/` replaced by `_`, e.g. `.../en-US/aws-native/logs/setup` → `aws-native_logs_setup.pdf`. URLs that don't match this pattern fall back to `page-<index>.pdf`.

## Config values to know

These are hardcoded constants at the top of `print.js` (no CLI args, no config file):

- `OUTPUT_DIR` — currently an absolute, machine-specific path under a user's home directory. Change this before running on a different machine, or when a task asks for output elsewhere.
- `URL_FILE` — defaults to `"urls.txt"`.
- `BATCH_SIZE` — concurrent pages per batch (default 10); lower it if Chromium is memory-constrained, raise it if the machine can handle more parallel tabs.
- `WAIT_AFTER_LOAD` — extra ms to wait after `networkidle` before printing, to let JS-rendered content settle (default 10000).

## Repo-specific notes

- `aws-mangaged-oss-docs/` and `logs/` are working artifacts from previous runs (PDF outputs and a run transcript), not part of the tool's source.
- `.env` only carries `ELEMENT_NAME`, consumed by `get-url-path.js` when read via `process.env` — but since that file runs in a browser console, the env var doesn't actually reach it through Node; treat `ELEMENT_NAME` in `.env.example` as documentation for manually editing the pasted snippet's default.
