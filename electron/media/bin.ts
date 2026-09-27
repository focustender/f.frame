import fs from "node:fs";

// MVP resolves the Homebrew ffmpeg; bundling a static build is post-MVP.
function resolve(name: string): string {
  for (const dir of ["/opt/homebrew/bin", "/usr/local/bin"]) {
    const p = `${dir}/${name}`;
    if (fs.existsSync(p)) return p;
  }
  return name;
}

export const FFMPEG = resolve("ffmpeg");
export const FFPROBE = resolve("ffprobe");
