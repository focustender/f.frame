import path from "node:path";
import fs from "node:fs/promises";
import { planCrop } from "./crop";
import { encodeImage } from "./image";
import { encodeVideo } from "./video";
import type { ExportJob, ExportProgress } from "../types";

// {name}-{16x9}-{1920w}
const baseName = (name: string, ratio: string, w: number) => `${name}-${ratio.replace(":", "x")}-${w}w`;

export async function runExport(job: ExportJob, emit: (p: ExportProgress) => void): Promise<void> {
  const { media } = job;
  await fs.mkdir(job.outDir, { recursive: true });

  for (const item of job.items) {
    const isVideo = media.kind !== "image";
    const plan = planCrop(media.width, media.height, item.ratio, item.offset, job.maxEdge, isVideo);
    const base = path.join(job.outDir, baseName(media.name, item.ratio, plan.outW));
    emit({ ratio: item.ratio, pct: 0, status: "running" });
    try {
      const outputs = isVideo
        ? await encodeVideo(
            media.encodePath,
            plan,
            { quality: job.quality, duration: media.duration, audio: media.kind === "video" && media.hasAudio && !job.stripAudio },
            base,
            (pct) => emit({ ratio: item.ratio, pct, status: "running" })
          )
        : await encodeImage(media.encodePath, plan, job.quality, base);
      emit({ ratio: item.ratio, pct: 1, status: "done", outputs });
    } catch (e) {
      emit({ ratio: item.ratio, pct: 0, status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }
}
