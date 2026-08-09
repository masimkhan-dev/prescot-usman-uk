/**
 * Code 128-B SVG Generator
 * Pure TypeScript implementation with zero external dependencies.
 * Converts alphanumeric SKU strings (e.g. "ACC-000123", "PHONE-000012") into SVG barcode rect elements.
 */

// Code 128 pattern definitions: widths of [bar1, space1, bar2, space2, bar3, space3]
const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3], // 0-3
  [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], // 4-7
  [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2], // 8-11
  [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1], [1, 1, 3, 2, 2, 2], // 12-15
  [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], // 16-19
  [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1], // 20-23
  [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2], // 24-27
  [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], // 28-31
  [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1], // 32-35
  [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3], // 36-39
  [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], // 40-43
  [1, 3, 2, 1, 3, 1], [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1], // 44-47
  [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3], // 48-51
  [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1], // 52-55
  [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1], // 56-59
  [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4], // 60-63
  [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], // 64-67
  [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4], [1, 2, 2, 1, 1, 4], [1, 2, 2, 4, 1, 1], // 68-71
  [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], [2, 4, 1, 2, 1, 1], [2, 2, 1, 1, 1, 4], // 72-75
  [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], [1, 1, 1, 2, 4, 2], // 76-79
  [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2], [1, 2, 4, 1, 1, 2], // 80-83
  [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2], [4, 2, 1, 2, 1, 1], // 84-87
  [2, 1, 2, 1, 4, 1], [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], [1, 1, 1, 1, 4, 3], // 88-91
  [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3], [1, 1, 4, 3, 1, 1], // 92-95
  [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1], [1, 1, 4, 1, 3, 1], // 96-99
  [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], [2, 1, 1, 2, 1, 4], // 100-103
  [2, 1, 1, 2, 3, 2], // 104: Start Code B
  [2, 3, 3, 1, 1, 1, 2] // 106: Stop Code (7 elements)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

export interface BarcodeRect {
  x: number;
  width: number;
}

export function generateCode128B(text: string): { rects: BarcodeRect[]; totalWidth: number } {
  const cleanText = text.trim();
  const symbolIndices: number[] = [START_CODE_B];

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    // ASCII 32 (' ') to 126 ('~') mapped to Code 128 values 0-94
    let val = charCode - 32;
    if (val < 0 || val > 94) val = 0; // Fallback space for unsupported characters
    symbolIndices.push(val);
  }

  // Calculate Code 128 checksum: (Start_Value + sum(pos * val)) % 103
  let checksum = START_CODE_B;
  for (let i = 1; i < symbolIndices.length; i++) {
    checksum += i * symbolIndices[i];
  }
  checksum = checksum % 103;

  symbolIndices.push(checksum);
  symbolIndices.push(STOP_CODE);

  const rects: BarcodeRect[] = [];
  let currentX = 10; // Quiet zone left

  for (const symIndex of symbolIndices) {
    const pattern = symIndex === STOP_CODE ? CODE128_PATTERNS[105] : CODE128_PATTERNS[symIndex];
    if (!pattern) continue;

    for (let p = 0; p < pattern.length; p++) {
      const width = pattern[p];
      const isBar = p % 2 === 0;

      if (isBar) {
        rects.push({ x: currentX, width });
      }
      currentX += width;
    }
  }

  currentX += 10; // Quiet zone right

  return { rects, totalWidth: currentX };
}
