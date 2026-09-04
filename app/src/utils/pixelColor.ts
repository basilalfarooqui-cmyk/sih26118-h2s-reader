import * as ImageManipulator from "expo-image-manipulator";
import { inflate } from "pako";

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = BASE64_CHARS.indexOf(clean[i]);
    const c1 = BASE64_CHARS.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] !== undefined ? BASE64_CHARS.indexOf(clean[i + 2]) : -1;
    const c3 = clean[i + 3] !== undefined ? BASE64_CHARS.indexOf(clean[i + 3]) : -1;

    const triple = (c0 << 18) | (c1 << 12) | ((c2 & 63) << 6) | (c3 & 63);

    bytes.push((triple >> 16) & 0xff);
    if (c2 !== -1) bytes.push((triple >> 8) & 0xff);
    if (c3 !== -1) bytes.push(triple & 0xff);
  }
  return Uint8Array.from(bytes);
}

/**
 * A resize down to 1x1 has no left neighbor or previous row, so every PNG
 * filter type (None/Sub/Up/Average/Paeth) resolves to the raw byte for the
 * sole pixel — no filter reconstruction needed beyond skipping the filter byte.
 */
function decodeSinglePixelPng(base64: string): { r: number; g: number; b: number } {
  const bytes = base64ToBytes(base64);
  let offset = 8; // skip PNG signature

  let colorType = -1;
  const idatChunks: Uint8Array[] = [];

  while (offset < bytes.length) {
    const length =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );
    const dataStart = offset + 8;

    if (type === "IHDR") {
      colorType = bytes[dataStart + 9];
    } else if (type === "IDAT") {
      idatChunks.push(bytes.slice(dataStart, dataStart + length));
    } else if (type === "IEND") {
      break;
    }

    offset = dataStart + length + 4; // skip CRC
  }

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : -1;
  if (bytesPerPixel === -1) {
    throw new Error(`Unsupported PNG color type: ${colorType}`);
  }

  const compressed = new Uint8Array(
    idatChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  );
  let pos = 0;
  for (const chunk of idatChunks) {
    compressed.set(chunk, pos);
    pos += chunk.length;
  }

  const raw = inflate(compressed);
  const filterByte = raw[0];
  if (filterByte !== 0) {
    // Still safe for a 1x1 image (see comment above) but flag anything unexpected.
    console.warn(`Unexpected PNG filter byte for 1x1 image: ${filterByte}`);
  }

  return {
    r: raw[1],
    g: raw[2],
    b: raw[3],
  };
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

/**
 * Crops the center 20% x 20% region of the photo and shrinks it to a single
 * pixel, whose color approximates the average color of that region.
 */
export async function extractCenterHexColor(
  photoUri: string,
  photoWidth: number,
  photoHeight: number
): Promise<string> {
  const cropWidth = Math.round(photoWidth * 0.2);
  const cropHeight = Math.round(photoHeight * 0.2);
  const originX = Math.round((photoWidth - cropWidth) / 2);
  const originY = Math.round((photoHeight - cropHeight) / 2);

  const result = await ImageManipulator.manipulateAsync(
    photoUri,
    [
      { crop: { originX, originY, width: cropWidth, height: cropHeight } },
      { resize: { width: 1, height: 1 } },
    ],
    { base64: true, format: ImageManipulator.SaveFormat.PNG }
  );

  if (!result.base64) {
    throw new Error("Image manipulation did not return base64 data");
  }

  const { r, g, b } = decodeSinglePixelPng(result.base64);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
