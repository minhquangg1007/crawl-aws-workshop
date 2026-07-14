
# PDF Workshop Downloader

This project automates downloading workshop documentation as PDF files using Playwright.

It reads a list of URLs from `urls.txt`, opens each page in Chromium, waits for the page to fully render, and saves it as a PDF. The URLs are processed in batches to improve performance while avoiding excessive memory usage.

---

## Features

* Read URLs from a text file
* Automatically generate PDF filenames from the URL path
* Save PDFs to a specified output directory
* Process multiple pages concurrently (default: 10 pages per batch)
* Wait for page rendering before printing
* Continue processing even if a page fails
* Display progress and timing information

---

## Requirements

* Node.js 18 or later (Node.js 22+ recommended)
* npm

---

## Installation

Clone or download this project.

Initialize the project if necessary:

```bash
npm init -y
```

Install Playwright:

```bash
npm install playwright
```

Install the Chromium browser used by Playwright:

```bash
npx playwright install chromium
```

---

## Project Structure

```text
.
├── get-url-path.js
├── print.js
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

Copy the output and save it as `urls.txt` (one URL per line) in the project directory before running `print.js`.


## Output Filename

The script extracts the path after `/en-US/` and replaces `/` with `_`.

Example:

| URL                                              | Output PDF                                 |
| ------------------------------------------------ | ------------------------------------------ |
| `.../en-US/aws-native`                           | `aws-native.pdf`                           |
| `.../en-US/aws-native/logs`                      | `aws-native_logs.pdf`                      |
| `.../en-US/aws-native/logs/setup`                | `aws-native_logs_setup.pdf`                |
| `.../en-US/aws-native/logs/setup/cloudwatchlogs` | `aws-native_logs_setup_cloudwatchlogs.pdf` |

---

## Configuration

Open `print.js` and adjust the configuration section.

```javascript
const OUTPUT_DIR = "/home/quang.pham3/Documents/Workshop PDFs";
const URL_FILE = "urls.txt";

const BATCH_SIZE = 10;
const WAIT_AFTER_LOAD = 10000;
```

### OUTPUT_DIR

Directory where generated PDFs will be saved.

Example:

```javascript
const OUTPUT_DIR = "./output";
```

or

```javascript
const OUTPUT_DIR = "/home/user/Documents/Workshop PDFs";
```

---

### URL_FILE

Input file containing the list of URLs.

Default:

```javascript
const URL_FILE = "urls.txt";
```

---

### BATCH_SIZE

Number of pages processed simultaneously.

Default:

```javascript
const BATCH_SIZE = 10;
```

Increase this value for faster execution if your computer has sufficient CPU and memory.

Decrease it if Chromium consumes too much memory.

---

### WAIT_AFTER_LOAD

Additional wait time (milliseconds) after the page reaches `networkidle`.

Default:

```javascript
const WAIT_AFTER_LOAD = 10000;
```

Equivalent to waiting 10 seconds before printing.

Useful for websites that continue rendering after network requests finish.

---

## Run

```bash
node print.js
```

Example output:

```text
Found 68 URLs

========== Batch 1 (10 pages) ==========
[1/68] Opening https://...
✅ Saved aws-native.pdf
[2/68] Opening https://...
✅ Saved aws-native_logs.pdf

========== Batch 2 (10 pages) ==========
...

=====================================
Finished!
Output folder: /home/quang.pham3/Documents/Workshop PDFs
Total time: 128.6s
=====================================
```

---

## Error Handling

If a page cannot be loaded or printed:

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

* The browser runs in **headless mode** by default.
* Each batch opens at most `BATCH_SIZE` browser tabs simultaneously.
* PDFs are generated using Chromium's built-in PDF engine.
* Existing PDF files with the same filename will be overwritten.

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
* Automatically log in using a persistent browser profile
