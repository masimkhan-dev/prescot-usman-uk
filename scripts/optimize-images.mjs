/**
 * optimize-images.mjs
 *
 * Generates responsive AVIF + WebP variants of all site images.
 * Run once: `node scripts/optimize-images.mjs`
 * Requires: npm install sharp (one-time dev dependency)
 *
 * Outputs to public/site-assets/responsive/ with filenames like:
 *   prescot-repair-hero-480.webp
 *   prescot-repair-hero-480.avif
 *   prescot-shopfront-768.webp
 *   etc.
 */

import sharp from "sharp";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = resolve(__dirname, "../public/site-assets");
const OUTPUT_DIR = resolve(__dirname, "../public/site-assets/responsive");

mkdirSync(OUTPUT_DIR, { recursive: true });

// Images and their responsive breakpoints
const IMAGE_CONFIGS = [
  {
    file: "prescot-repair-hero.webp",
    widths: [480, 768, 1280, 1920],
    quality: { webp: 82, avif: 65 },
  },
  {
    file: "prescot-shopfront.webp",
    widths: [480, 768, 1200],
    quality: { webp: 80, avif: 62 },
  },
  {
    file: "hero-workbench.jpg",
    widths: [480, 768, 1200],
    quality: { webp: 80, avif: 62 },
  },
  {
    file: "prescot-logo.png",
    widths: [128, 256],
    quality: { webp: 90, avif: 75 },
  },
  {
    file: "prescot-products-banner.webp",
    widths: [480, 768, 1280],
    quality: { webp: 80, avif: 62 },
  },
  {
    file: "product-phone.jpg",
    widths: [320, 600],
    quality: { webp: 82, avif: 65 },
  },
  {
    file: "product-laptop.jpg",
    widths: [320, 600],
    quality: { webp: 82, avif: 65 },
  },
  {
    file: "product-console.jpg",
    widths: [320, 600],
    quality: { webp: 82, avif: 65 },
  },
  {
    file: "product-accessories.jpg",
    widths: [320, 600],
    quality: { webp: 82, avif: 65 },
  },
];

let totalSaved = 0;
let totalGenerated = 0;

async function processImage(config) {
  const inputPath = resolve(INPUT_DIR, config.file);
  if (!existsSync(inputPath)) {
    console.warn(`  SKIP: ${config.file} not found`);
    return;
  }

  const stem = basename(config.file, extname(config.file));
  const meta = await sharp(inputPath).metadata();
  console.log(`\n${config.file} (${meta.width}x${meta.height})`);

  for (const width of config.widths) {
    if (width > meta.width) {
      console.log(`  SKIP ${width}px — larger than source (${meta.width}px)`);
      continue;
    }

    // WebP
    const webpPath = resolve(OUTPUT_DIR, `${stem}-${width}.webp`);
    const webpInfo = await sharp(inputPath)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality: config.quality.webp })
      .toFile(webpPath);
    console.log(`  OK ${stem}-${width}.webp (${(webpInfo.size / 1024).toFixed(1)} KB)`);
    totalGenerated++;

    // AVIF
    const avifPath = resolve(OUTPUT_DIR, `${stem}-${width}.avif`);
    const avifInfo = await sharp(inputPath)
      .resize(width, null, { withoutEnlargement: true })
      .avif({ quality: config.quality.avif })
      .toFile(avifPath);
    console.log(`  OK ${stem}-${width}.avif (${(avifInfo.size / 1024).toFixed(1)} KB)`);
    totalGenerated++;
  }
}

async function main() {
  // Check if sharp is available
  try {
    await import("sharp");
  } catch {
    console.error("sharp not installed. Run: npm install sharp --save-dev");
    process.exit(1);
  }

  console.log("Generating responsive AVIF + WebP images...\n");

  for (const config of IMAGE_CONFIGS) {
    await processImage(config);
  }

  console.log(`\nDone. Generated ${totalGenerated} files in public/site-assets/responsive/`);
  console.log("Commit the responsive/ directory to source control.");
}

main().catch((err) => {
  console.error("Image optimization failed:", err.message);
  process.exit(1);
});
