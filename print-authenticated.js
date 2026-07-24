const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

// =======================
// Configuration
//
// Use this script for AWS Workshop Studio pages that require login (an
// event dashboard, a private catalog link, etc.). It attaches to your real,
// already-running Chrome over CDP so authenticated pages render correctly.
//
// For public workshops that don't need login, use print-public.js instead —
// it's simpler and runs headless.
// =======================

const OUTPUT_DIR = "/home/quang.pham3/Documents/learn/crawl-aws-workshop/output";
const URL_FILE = "urls.txt";

// Chrome must already be running with a remote debugging port before this
// script starts. Chrome refuses --remote-debugging-port on its default
// profile directory, so use a dedicated one for automation:
//   mkdir -p ~/.chrome-automation-profile
//   google-chrome --user-data-dir="$HOME/.chrome-automation-profile" --remote-debugging-port=9222
// Log in to the workshop page in that window once — the session persists on
// disk, so future runs are already logged in. Leave the window open, then run this script.
const CDP_ENDPOINT = "http://localhost:9222";

const BATCH_SIZE = 3; // lower than headless mode — this drives real, visible tabs
const WAIT_AFTER_LOAD = 10000; // milliseconds

// =======================

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function getFilename(url, index) {
    try {
        const pathname = new URL(url).pathname;

        const match = pathname.match(/\/en-US\/(.+)$/);

        if (!match) {
            return `page-${index + 1}.pdf`;
        }

        return match[1].replace(/\//g, "_") + ".pdf";
    } catch {
        return `page-${index + 1}.pdf`;
    }
}

(async () => {

    const urls = fs
        .readFileSync(URL_FILE, "utf8")
        .split(/\r?\n/)
        .map(u => u.trim())
        .filter(Boolean);

    console.log(`Found ${urls.length} URLs\n`);

    let browser;

    try {
        browser = await chromium.connectOverCDP(CDP_ENDPOINT);
    } catch (err) {
        console.error(`❌ Could not connect to Chrome at ${CDP_ENDPOINT}.`);
        console.error("Launch Chrome with a dedicated automation profile:");
        console.error('  mkdir -p ~/.chrome-automation-profile');
        console.error('  google-chrome --user-data-dir="$HOME/.chrome-automation-profile" --remote-debugging-port=9222');
        console.error("Log in to the workshop page in that window, leave it open, and try again.");
        process.exit(1);
    }

    const context = browser.contexts()[0];

    if (!context) {
        console.error("❌ No browser context found. Open at least one tab in Chrome and try again.");
        process.exit(1);
    }

    const totalStart = Date.now();

    for (let start = 0; start < urls.length; start += BATCH_SIZE) {

        const batch = urls.slice(start, start + BATCH_SIZE);

        console.log(
            `========== Batch ${Math.floor(start / BATCH_SIZE) + 1} (${batch.length} pages) ==========`
        );

        await Promise.all(
            batch.map(async (url, batchIndex) => {

                const globalIndex = start + batchIndex;
                const filename = getFilename(url, globalIndex);
                const pdfPath = path.join(OUTPUT_DIR, filename);

                const page = await context.newPage();

                try {

                    console.log(
                        `[${globalIndex + 1}/${urls.length}] Opening ${url}`
                    );

                    await page.goto(url, {
                        waitUntil: "networkidle",
                        timeout: 60000
                    });

                    await page.waitForTimeout(WAIT_AFTER_LOAD);

                    // page.pdf() only works in headless Chromium — since this is a
                    // real, headed Chrome window, call the same DevTools Protocol
                    // command the print dialog (Ctrl+P) uses under the hood.
                    const client = await context.newCDPSession(page);

                    const { data } = await client.send("Page.printToPDF", {
                        printBackground: true,
                        preferCSSPageSize: true
                    });

                    fs.writeFileSync(pdfPath, Buffer.from(data, "base64"));

                    console.log(
                        `✅ Saved ${filename}`
                    );

                } catch (err) {

                    console.error(
                        `❌ Failed: ${url}`
                    );

                    console.error(err.message);

                } finally {

                    await page.close();

                }

            })
        );

        console.log("");
    }

    // Do NOT call browser.close() — this is the user's real, already-open Chrome
    // connected over CDP, not a browser we launched. We just stop using it.

    const seconds = ((Date.now() - totalStart) / 1000).toFixed(1);

    console.log("=====================================");
    console.log("Finished!");
    console.log(`Output folder: ${OUTPUT_DIR}`);
    console.log(`Total time: ${seconds}s`);
    console.log("=====================================");

})();