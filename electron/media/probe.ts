import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import { FFPROBE } from "./bin";
import type { MediaInfo } from "../types";

const run = promisify(execFile);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff", ".heic", ".heif"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv"]);

// sharp's prebuilt libvips can't decode HEVC-coded HEIC, so convert with macOS sips.
async function heicToJpeg(src: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fframe-"));
  const out = path.join(dir, path.basename(src, path.extname(src)) + ".jpg");
  await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "100", src, "--out", out]);
  return out;
}

export async function probe(src: string): Promise<MediaInfo> {
  const ext = path.extname(src).toLowerCase();
  const name = path.basename(src, ext);

  if (ext === ".gif" || VIDEO_EXT.has(ext)) {
    const { stdout } = await run(FFPROBE, [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height:stream_side_data=rotation:stream_tags=rotate:format=duration",
      "-of", "json",
      src,
    ]);
    const json = JSON.parse(stdout);
    const s = json.streams?.[0];
    if (!s) throw new Error("No video stream found");
    const rotation = Number(s.side_data_list?.find((d: { rotation?: number }) => d.rotation !== undefined)?.rotation ?? s.tags?.rotate ?? 0);
    const quarter = Math.abs(rotation) % 180 === 90;
    const { stdout: audio } = await run(FFPROBE, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", src]);
    return {
      kind: ext === ".gif" ? "gif" : "video",
      path: src,
      encodePath: src,
      previewPath: src,
      name,
      // ffmpeg auto-rotates on decode, so crop coordinates use the displayed size.
      width: quarter ? s.height : s.width,
      height: quarter ? s.width : s.height,
      duration: Number(json.format?.duration) || 0,
      hasAudio: audio.trim().length > 0,
    };
  }

  if (IMAGE_EXT.has(ext)) {
    const decodable = ext === ".heic" || ext === ".heif" ? await heicToJpeg(src) : src;
    const meta = await sharp(decodable).metadata();
    const swap = (meta.orientation ?? 1) >= 5;
    return {
      kind: "image",
      path: src,
      encodePath: decodable,
      previewPath: decodable,
      name,
      width: swap ? meta.height! : meta.width!,
      height: swap ? meta.width! : meta.height!,
      duration: 0,
      hasAudio: false,
    };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
