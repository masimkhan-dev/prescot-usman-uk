/**
 * download-fonts.mjs
 *
 * Downloads self-hosted WOFF2 font files from Google Fonts CSS API.
 * Run once before building: `node scripts/download-fonts.mjs`
 *
 * This eliminates the render-blocking Google Fonts stylesheet that added
 * ~970ms to FCP on slow 4G connections.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = resolve(__dirname, "../public/fonts");

// Google Fonts CSS API — uses User-Agent to return WOFF2 links
const GOOGLE_FONTS_API = "https://fonts.googleapis.com/css2";

// User-Agent that triggers WOFF2 responses from Google Fonts
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchCss(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Failed to fetch CSS: ${res.status} ${url}`);
  return res.text();
}

async function downloadFont(url, dest) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Failed to download font: ${res.status} ${url}`);
  const buffer = await res.arrayBuffer();
  writeFileSync(dest, Buffer.from(buffer));
  const kb = (buffer.byteLength / 1024).toFixed(1);
  console.log(`  OK ${dest.split("/").pop()} (${kb} KB)`);
}

function extractWoff2Urls(css) {
  const matches = [...css.matchAll(/src:\s*url\(([^)]+\.woff2)\)/g)];
  return matches.map((m) => m[1]);
}

async function main() {
  mkdirSync(FONTS_DIR, { recursive: true });
  console.log("Downloading self-hosted fonts into /public/fonts/\n");

  // Bricolage Grotesque (600-700 weight, variable)
  console.log("Bricolage Grotesque (600-700):");
  const bricolageCss = await fetchCss(
    `${GOOGLE_FONTS_API}?family=Bricolage+Grotesque:opsz,wght@12..96,600..700&display=swap&subset=latin`,
  );
  const bricourls = extractWoff2Urls(bricolageCss);
  const bricolageUrl = bricourls.find((u) => u) || bricourls[0];
  if (!bricolageUrl) throw new Error("Could not extract Bricolage Grotesque WOFF2 URL");
  await downloadFont(bricolageUrl, `${FONTS_DIR}/bricolage-grotesque-600-700.woff2`);

  // Inter (400, 500, 600, 700)
  console.log("\nInter:");
  const interWeights = [400, 500, 600, 700];
  for (const weight of interWeights) {
    const interCss = await fetchCss(
      `${GOOGLE_FONTS_API}?family=Inter:wght@${weight}&display=swap&subset=latin`,
    );
    const interUrls = extractWoff2Urls(interCss);
    const interUrl = interUrls.find((u) => u) || interUrls[0];
    if (!interUrl) throw new Error(`Could not extract Inter ${weight} WOFF2 URL`);
    await downloadFont(interUrl, `${FONTS_DIR}/inter-${weight}.woff2`);
  }

  console.log("\nAll fonts downloaded. Commit /public/fonts/ to source control.");
  console.log("   These replace the render-blocking Google Fonts stylesheet.");
}

main().catch((err) => {
  console.error("Font download failed:", err.message);
  process.exit(1);
});
