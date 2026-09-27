import sharp from "sharp";
import type { CropPlan } from "./crop";
import type { Quality } from "../types";

const PRESETS: Record<Quality, { avif: number; webp: number }> = {
  balanced: { avif: 55, webp: 80 },
  small: { avif: 40, webp: 65 },
};

function cropped(src: string, p: CropPlan) {
  // rotate() with no args applies EXIF orientation; sharp strips metadata by default.
  return sharp(src)
    .rotate()
    .extract({ left: p.cropX, top: p.cropY, width: p.cropW, height: p.cropH })
    .resize(p.outW, p.outH, { kernel: "lanczos3" });
}

export async function encodeImage(src: string, p: CropPlan, quality: Quality, base: string): Promise<string[]> {
  const q = PRESETS[quality];
  const avif = `${base}.avif`;
  const webp = `${base}.webp`;
  await cropped(src, p).avif({ quality: q.avif, effort: 6 }).toFile(avif);
  await cropped(src, p).webp({ quality: q.webp, effort: 5, smartSubsample: true }).toFile(webp);
  return [avif, webp];
}
