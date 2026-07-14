const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

// =======================
// Configuration
// =======================

const OUTPUT_DIR = "/home/quang.pham3/Downloads/[WORKSHOP] Hands-On AWS Observability: Mastering CloudWatch Metrics, Alarms & Dashboards/test/output";
const URL_FILE = "urls.txt";

const BATCH_SIZE = 10;
const WAIT_AFTER_LOAD = 5000; // milliseconds

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

    const browser = await chromium.launch({
        headless: true
    });

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

                const page = await browser.newPage();

                try {

                    console.log(
                        `[${globalIndex + 1}/${urls.length}] Opening ${url}`
                    );

                    await page.goto(url, {
                        waitUntil: "networkidle",
                        timeout: 60000
                    });

                    await page.waitForTimeout(WAIT_AFTER_LOAD);

                    await page.pdf({
                        path: pdfPath,
                        format: "A4",
                        printBackground: true
                    });

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

    await browser.close();

    const seconds = ((Date.now() - totalStart) / 1000).toFixed(1);

    console.log("=====================================");
    console.log("Finished!");
    console.log(`Output folder: ${OUTPUT_DIR}`);
    console.log(`Total time: ${seconds}s`);
    console.log("=====================================");

})();