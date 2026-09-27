export type MediaKind = "image" | "video" | "gif";

export interface MediaInfo {
  kind: MediaKind;
  path: string; // original file
  encodePath: string; // file the encoder reads (HEIC gets converted first)
  previewPath: string;
  name: string;
  width: number; // displayed size, after EXIF / rotation metadata
  height: number;
  duration: number;
  hasAudio: boolean;
}

export type Quality = "balanced" | "small";

export interface ExportItem {
  ratio: string;
  offset: { x: number; y: number };
}

export interface ExportJob {
  media: MediaInfo;
  items: ExportItem[];
  outDir: string;
  maxEdge: number;
  quality: Quality;
  stripAudio: boolean;
}

export interface ExportProgress {
  ratio: string;
  file?: string;
  pct: number; // 0-1 for this ratio
  status: "running" | "done" | "error";
  outputs?: string[];
  error?: string;
}
