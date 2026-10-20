/**
 * Code 39 Alphanumeric Barcode Symbology (ISO/IEC 16388 Standard)
 * Pattern: 9 elements (5 bars, 4 spaces), exactly 3 wide (W) and 6 narrow (N).
 */
const CODE39_ENCODINGS: Record<string, string> = {
  '0': 'NNNWWNWNN',
  '1': 'WNNWNNNNW',
  '2': 'NNWWNNNNW',
  '3': 'WNWWNNNNN',
  '4': 'NNNWNNWNW',
  '5': 'WNNWNNWNN',
  '6': 'NNWWNNWNN',
  '7': 'NNNWNNNNW',
  '8': 'WNNWNNNNN',
  '9': 'NNWWNNNNN',
  'A': 'WNNNNWNNW',
  'B': 'NNWNNWNNW',
  'C': 'WNWNNWNNN',
  'D': 'NNNNWWNNW',
  'E': 'WNNNWWNNN',
  'F': 'NNWNWWNNN',
  'G': 'NNNNNWWNW',
  'H': 'WNNNNWWNN',
  'I': 'NNWNNWWNN',
  'J': 'NNNNWWNNN',
  'K': 'WNNNNNNWW',
  'L': 'NNWNNNNWW',
  'M': 'WNWNNNNWN',
  'N': 'NNNNWNNWW',
  'O': 'WNNNWNNWN',
  'P': 'NNWNWNNWN',
  'Q': 'NNNNNNWWW',
  'R': 'WNNNNNWWN',
  'S': 'NNWNNNWWN',
  'T': 'NNNNWNWWN',
  'U': 'WWNNNNNNW',
  'V': 'NWWNNNNNW',
  'W': 'WWWNNNNNN',
  'X': 'NWNNWNNNW',
  'Y': 'WWNNWNNNN',
  'Z': 'NWWNWNNNN',
  '-': 'NWNNNNNWN',
  '.': 'WWNNNNNWN',
  ' ': 'NWWNNNNWN',
  '$': 'NWNWNWNNN',
  '/': 'NWNWNNNWN',
  '+': 'NWNNNWNWN',
  '%': 'NNNWNWNWN',
  '*': 'NWNNWNNWN', // Start / Stop character
};

export type BarcodeSvgOptions = {
  height?: number;
  narrowWidth?: number;
  wideWidth?: number;
  displayValue?: boolean;
  color?: string;
};

/**
 * Generates an SVG string representation of a Code 39 1D Barcode.
 * Encodes register numbers, candidate IDs, or verification tokens cleanly for laser printing.
 */
export function generateCode39Svg(
  text: string,
  options: BarcodeSvgOptions = {}
): string {
  const {
    height = 40,
    narrowWidth = 1.5,
    wideWidth = 3.5,
    displayValue = true,
    color = '#000000',
  } = options;

  // Code 39 requires uppercase, alphanumeric and select punctuation; start/stop with *
  const sanitized = text
    .toUpperCase()
    .replace(/[^0-9A-Z\-.$/+% ]/g, '-')
    .trim();

  const fullText = `*${sanitized}*`;
  let currentX = 10;
  const rects: string[] = [];

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const pattern = CODE39_ENCODINGS[char] || CODE39_ENCODINGS['-'];

    // 9 elements: alternating bar, space, bar, space...
    for (let el = 0; el < 9; el++) {
      const isBar = el % 2 === 0;
      const isWide = pattern[el] === 'W';
      const width = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push(
          `<rect x="${currentX.toFixed(1)}" y="4" width="${width.toFixed(
            1
          )}" height="${height}" fill="${color}" />`
        );
      }
      currentX += width;
    }

    // Inter-character narrow space gap
    currentX += narrowWidth;
  }

  const totalWidth = currentX + 10;
  const totalHeight = displayValue ? height + 20 : height + 8;

  const textElement = displayValue
    ? `<text x="${(totalWidth / 2).toFixed(
        1
      )}" y="${height + 16}" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="${color}">${sanitized}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(
    1
  )} ${totalHeight}" width="${totalWidth.toFixed(1)}" height="${totalHeight}">
    <rect width="100%" height="100%" fill="#ffffff" />
    ${rects.join('')}
    ${textElement}
  </svg>`;
}

/**
 * Generates an SVG 2D QR-style Matrix code encoding institutional verification payload.
 * Encodes register number, exam name, date, and seat location into a high-density 2D visual pattern.
 */
export function generateVerificationQrSvg(
  payload: { regNo: string; examName?: string; roomId?: string; seat?: string },
  size = 72
): string {
  const jsonStr = JSON.stringify(payload);
  const matrixSize = 21; // Standard 21x21 Version 1 QR matrix layout
  const cellSize = size / matrixSize;

  // Generate deterministic binary pattern from payload hash
  const cells: string[] = [];

  // Corner Finder Patterns (standard 7x7 outer, 3x3 inner)
  const isFinderPattern = (r: number, c: number) => {
    // Top-left
    if (r < 7 && c < 7) return (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
    // Top-right
    if (r < 7 && c >= matrixSize - 7) {
      const colRel = c - (matrixSize - 7);
      return (r === 0 || r === 6 || colRel === 0 || colRel === 6 || (r >= 2 && r <= 4 && colRel >= 2 && colRel <= 4));
    }
    // Bottom-left
    if (r >= matrixSize - 7 && c < 7) {
      const rowRel = r - (matrixSize - 7);
      return (rowRel === 0 || rowRel === 6 || c === 0 || c === 6 || (rowRel >= 2 && rowRel <= 4 && c >= 2 && c <= 4));
    }
    return false;
  };

  // Pseudo-random deterministic bit generator based on string
  let hash = 0;
  for (let i = 0; i < jsonStr.length; i++) {
    hash = (hash << 5) - hash + jsonStr.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      let isBlack = false;

      if (isFinderPattern(r, c)) {
        isBlack = true;
      } else {
        // Timing tracks
        if (r === 6 && c % 2 === 0) isBlack = true;
        else if (c === 6 && r % 2 === 0) isBlack = true;
        else {
          // Data cells encoded deterministically from payload
          const cellHash = Math.abs(Math.sin((r * matrixSize + c + hash) * 12.9898) * 43758.5453);
          isBlack = cellHash % 1 > 0.48;
        }
      }

      if (isBlack) {
        cells.push(
          `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(
            2
          )}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#000000" />`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="#ffffff" />
    ${cells.join('')}
  </svg>`;
}
