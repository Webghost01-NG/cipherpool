import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const url = process.env.QA_URL?.trim();
if (!url) throw new Error("QA_URL is required.");
const parsedUrl = new URL(url);
if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
  throw new Error("QA_URL must use HTTPS or localhost.");
}

const chrome = process.env.CHROME_BIN?.trim() || "google-chrome";
const outputDir = path.resolve(process.env.QA_OUTPUT_DIR?.trim() || "docs/qa/evidence");
const viewports = [
  { label: "live-desktop", width: 1440, height: 900 },
  { label: "live-tablet", width: 768, height: 1024 },
  { label: "live-mobile", width: 390, height: 844 },
];
const requiredMarkers = ["Veylott", "Connect wallet", "Protocol state", "Deployment verified"];

fs.mkdirSync(outputDir, { recursive: true });

function runChrome(args) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "veylott-chrome-"));
  try {
    const result = spawnSync(chrome, [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      `--user-data-dir=${profile}`,
      "--virtual-time-budget=20000",
      ...args,
      url,
    ], { encoding: "utf8", timeout: 45_000 });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Chrome exited with status ${result.status}: ${result.stderr.trim()}`);
    }
    return result.stdout;
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

for (const viewport of viewports) {
  const target = path.join(outputDir, `${viewport.label}.png`);
  runChrome([
    `--window-size=${viewport.width},${viewport.height}`,
    `--screenshot=${target}`,
  ]);
  const png = fs.readFileSync(target);
  if (png.length < 24 || png.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`${target} is not a valid PNG capture.`);
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== viewport.width || height !== viewport.height) {
    throw new Error(`${target} is ${width}x${height}; expected ${viewport.width}x${viewport.height}.`);
  }
}

const html = runChrome(["--dump-dom"]);
for (const marker of requiredMarkers) {
  if (!html.includes(marker)) throw new Error(`Rendered page is missing required marker: ${marker}`);
}

console.log(JSON.stringify({
  url: parsedUrl.toString(),
  viewports: viewports.map(({ label, width, height }) => ({ label, width, height })),
  requiredMarkers,
}, null, 2));
