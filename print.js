const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const { chromium } = require("playwright");

(async () => {
    const urls = fs
        .readFileSync("urls.txt", "utf8")
        .split("\n")
        .map(url => url.trim())
        .filter(Boolean);

    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        console.log(`(${i + 1}/${urls.length}) Opening ${url}`);

        await page.goto(url, {
            waitUntil: "networkidle"
        });

        // Wait another 10 seconds
        await page.waitForTimeout(10000);

        const filename = getFilename(url, i);

        await page.pdf({
            path: filename,
            format: "A4",
            printBackground: true
        });

        console.log(`Saved ${filename}`);
    }

    await browser.close();

    console.log("Done!");
})();



function getFilename(url, index) {
    const pathname = new URL(url).pathname;

    // Find everything after "/en-US/"
    const match = pathname.match(/\/en-US\/(.+)$/);

    if (!match) {
        return `page-${index + 1}.pdf`;
    }

    return `${match[1].replace(/\//g, "_")}.pdf`;
}