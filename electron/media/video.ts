import { spawn } from "node:child_process";
import sharp from "sharp";
import { FFMPEG } from "./bin";
import type { CropPlan } from "./crop";
import type { Quality } from "../types";

const PRESETS: Record<Quality, { x264: number; av1: number; aac: string; opus: string }> = {
  balanced: { x264: 23, av1: 35, aac: "128k", opus: "96k" },
  small: { x264: 28, av1: 42, aac: "96k", opus: "64k" },
};

const filter = (p: CropPlan) =>
  `crop=${p.cropW}:${p.cropH}:${p.cropX}:${p.cropY},scale=${p.outW}:${p.outH}:flags=lanczos,setsar=1,format=yuv420p`;

function ffmpeg(args: string[], duration: number, onPct: (pct: number) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args]);
    const out: Buffer[] = [];
    let err = "";
    proc.stdout.on("data", (d: Buffer) => {
      out.push(d);
      const m = [...d.toString().matchAll(/out_time_us=(\d+)/g)].pop();
      if (m && duration > 0) onPct(Math.min(1, Number(m[1]) / 1e6 / duration));
    });
    proc.stderr.on("data", (d: Buffer) => (err += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(err.trim() || `ffmpeg exited ${code}`))));
  });
}

export async function encodeVideo(
  src: string,
  p: CropPlan,
  opts: { quality: Quality; duration: number; audio: boolean },
  base: string,
  onPct: (pct: number) => void
): Promise<string[]> {
  const q = PRESETS[opts.quality];
  const vf = filter(p);
  const mp4 = `${base}.mp4`;
  const webm = `${base}.webm`;
  const poster = `${base}-poster.webp`;
  const audio = (codec: string[]) => (opts.audio ? codec : ["-an"]);

  // Two encodes, each weighted as half of this ratio's progress.
  await ffmpeg(
    ["-i", src, "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", String(q.x264), "-profile:v", "high",
      ...audio(["-c:a", "aac", "-b:a", q.aac]), "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", mp4],
    opts.duration,
    (pct) => onPct(pct * 0.5)
  );
  await ffmpeg(
    ["-i", src, "-vf", vf, "-c:v", "libsvtav1", "-preset", "6", "-crf", String(q.av1), "-g", "240",
      ...audio(["-c:a", "libopus", "-b:a", q.opus]), "-progress", "pipe:1", "-nostats", webm],
    opts.duration,
    (pct) => onPct(0.5 + pct * 0.5)
  );

  // ffmpeg here has no libwebp, so grab the first frame as PNG and let sharp encode it.
  const png = await ffmpeg(["-i", src, "-vf", vf, "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "pipe:1"], 0, () => {});
  await sharp(png).webp({ quality: 75 }).toFile(poster);

  return [mp4, webm, poster];
}
