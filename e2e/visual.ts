// 005 R2: helpers for the visual test. The diff runs in the browser on a canvas, so it needs no image library.
import type { Page } from "./test";

/** Width and height from a PNG's IHDR chunk. */
export function pngSize(png: Buffer): { width: number; height: number } {
  const signature = "89504e470d0a1a0a";
  if (png.subarray(0, 8).toString("hex") !== signature || png.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("Not a PNG");
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

export interface ImageDiff {
  /** Differing pixels / all pixels. */
  ratio: number;
  differentPixels: number;
  totalPixels: number;
  /** PNG: differences in red over a faded, grey copy of `expected`. */
  image: Buffer;
}

/**
 * Compares two same-sized PNGs pixel by pixel, with pixelmatch's YIQ colour delta at `threshold` (Playwright's default
 * is 0.2). Unlike Playwright, it doesn't excuse anti-aliased pixels, so it is at least as strict.
 * It runs in a scratch page, which is closed afterwards, so the page under test is never touched.
 */
export async function diffImages(page: Page, actual: Buffer, expected: Buffer, threshold = 0.2): Promise<ImageDiff> {
  const scratch = await page.context().newPage();
  try {
    const result = await scratch.evaluate(
      async ({ actual, expected, threshold }) => {
        const decode = async (base64: string) => {
          const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
          // No colour management or premultiplying, so the values are the file's own.
          const bitmap = await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
          const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
          context.drawImage(bitmap, 0, 0);
          return context.getImageData(0, 0, bitmap.width, bitmap.height);
        };
        const [a, b] = await Promise.all([decode(actual), decode(expected)]);
        if (a.width !== b.width || a.height !== b.height) {
          throw new Error(`Image sizes differ: ${a.width}×${a.height} and ${b.width}×${b.height}`);
        }

        // YIQ, as in pixelmatch (Kotsarenko and Ramos, "Measuring perceived color difference using YIQ NTSC
        // transmission color space in mobile applications", 2010). 35215 is the largest possible delta.
        const y = (r: number, g: number, bl: number) => r * 0.29889531 + g * 0.58662247 + bl * 0.11448223;
        const i = (r: number, g: number, bl: number) => r * 0.59597799 - g * 0.2741761 - bl * 0.32180189;
        const q = (r: number, g: number, bl: number) => r * 0.21147017 - g * 0.52261711 + bl * 0.31114694;
        // Transparent pixels are blended onto white first.
        const blend = (c: number, alpha: number) => 255 + (c - 255) * alpha;
        const maxDelta = 35215 * threshold * threshold;

        const out = new ImageData(a.width, a.height);
        let differentPixels = 0;
        for (let k = 0; k < a.data.length; k += 4) {
          const alphaA = a.data[k + 3] / 255;
          const alphaB = b.data[k + 3] / 255;
          const [r1, g1, b1] = [0, 1, 2].map((c) => blend(a.data[k + c], alphaA));
          const [r2, g2, b2] = [0, 1, 2].map((c) => blend(b.data[k + c], alphaB));
          const dy = y(r1, g1, b1) - y(r2, g2, b2);
          const di = i(r1, g1, b1) - i(r2, g2, b2);
          const dq = q(r1, g1, b1) - q(r2, g2, b2);
          const delta = 0.5053 * dy * dy + 0.299 * di * di + 0.1957 * dq * dq;
          if (delta > maxDelta) {
            differentPixels++;
            out.data.set([255, 0, 0, 255], k);
          } else {
            const grey = 255 + (y(r2, g2, b2) - 255) * 0.1;
            out.data.set([grey, grey, grey, 255], k);
          }
        }

        const canvas = new OffscreenCanvas(a.width, a.height);
        canvas.getContext("2d")!.putImageData(out, 0, 0);
        const png = await canvas.convertToBlob({ type: "image/png" });
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the diff image"));
          reader.readAsDataURL(png);
        });
        const totalPixels = a.width * a.height;
        return { differentPixels, totalPixels, ratio: differentPixels / totalPixels, image: dataUrl.split(",")[1] };
      },
      { actual: actual.toString("base64"), expected: expected.toString("base64"), threshold },
    );
    return { ...result, image: Buffer.from(result.image, "base64") };
  } finally {
    await scratch.close();
  }
}
