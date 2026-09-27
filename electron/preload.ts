import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { ExportJob, ExportProgress, MediaInfo } from "./types";

export interface FFrameApi {
  pathForFile: (file: File) => string;
  openMedia: () => Promise<string | null>;
  probe: (file: string) => Promise<MediaInfo>;
  pickFolder: () => Promise<string | null>;
  defaultFolder: () => Promise<string>;
  reveal: (file: string) => Promise<void>;
  exportMedia: (job: ExportJob, onProgress: (p: ExportProgress) => void) => Promise<void>;
  pendingOpen: () => Promise<string | null>;
  onOpenPath: (cb: (file: string) => void) => () => void;
}

const api: FFrameApi = {
  // File.path was removed in Electron 32; webUtils is the replacement for drag-drop.
  pathForFile: (file) => webUtils.getPathForFile(file),
  openMedia: () => ipcRenderer.invoke("media:open"),
  probe: (file) => ipcRenderer.invoke("media:probe", file),
  pickFolder: () => ipcRenderer.invoke("folder:pick"),
  defaultFolder: () => ipcRenderer.invoke("folder:default"),
  reveal: (file) => ipcRenderer.invoke("shell:reveal", file),
  exportMedia: async (job, onProgress) => {
    const listener = (_e: Electron.IpcRendererEvent, p: ExportProgress) => onProgress(p);
    ipcRenderer.on("export:progress", listener);
    try {
      await ipcRenderer.invoke("export:run", job);
    } finally {
      ipcRenderer.removeListener("export:progress", listener);
    }
  },
  pendingOpen: () => ipcRenderer.invoke("media:pending"),
  onOpenPath: (cb) => {
    const listener = (_e: Electron.IpcRendererEvent, file: string) => cb(file);
    ipcRenderer.on("media:open-path", listener);
    return () => ipcRenderer.removeListener("media:open-path", listener);
  },
};

contextBridge.exposeInMainWorld("fframe", api);
