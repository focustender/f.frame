import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from "electron";
import { probe } from "./media/probe";
import { runExport } from "./media/export";
import type { ExportJob } from "./types";

const isDev = process.env.NODE_ENV === "development";

app.setName("f.frame");

// Local files are served to the renderer through media://local/<encoded path>,
// since the dev renderer runs on http://localhost and can't load file:// URLs.
protocol.registerSchemesAsPrivileged([
  { scheme: "media", privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } },
]);

function registerIpcHandlers(): void {
  ipcMain.handle("media:probe", (_e, file: string) => probe(file));

  ipcMain.handle("media:open", async () => {
    const res = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Media", extensions: ["jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "tif", "tiff", "gif", "mp4", "mov", "m4v", "webm", "mkv"] }],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle("folder:pick", async () => {
    const res = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle("folder:default", () => path.join(os.homedir(), "Downloads", "f.frame"));

  // Renderer pulls a file queued before it mounted (launch via Dock drop / FFRAME_OPEN).
  ipcMain.handle("media:pending", () => {
    const file = pendingOpen;
    pendingOpen = null;
    return file;
  });

  ipcMain.handle("shell:reveal", (_e, file: string) => shell.showItemInFolder(file));

  ipcMain.handle("export:run", (e, job: ExportJob) =>
    runExport(job, (p) => e.sender.send("export:progress", p))
  );
}

let mainWindow: BrowserWindow | null = null;
let pendingOpen: string | null = process.env.FFRAME_OPEN ?? null;

// Files dropped on the Dock icon (or FFRAME_OPEN in dev) are handed to the renderer.
function sendOpen(file: string): void {
  if (mainWindow && !mainWindow.webContents.isLoading()) mainWindow.webContents.send("media:open-path", file);
  else pendingOpen = file;
}
app.on("open-file", (e, file) => {
  e.preventDefault();
  sendOpen(file);
});

function createWindow(): void {
  const win = (mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#202327", // --ft-blue-900, avoids a white flash before CSS loads
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  }));

  win.webContents.on("did-finish-load", () => {
    // Dev-only visual check: FFRAME_SHOT=/path.png captures the window after media settles.
    const shot = process.env.FFRAME_SHOT;
    if (shot) {
      setTimeout(async () => {
        const img = await win.webContents.capturePage();
        await import("node:fs/promises").then((fs) => fs.writeFile(shot, img.toPNG()));
        if (process.env.FFRAME_SHOT_QUIT) app.quit();
      }, Number(process.env.FFRAME_SHOT_DELAY ?? 2500));
    }
  });

  if (isDev) {
    win.loadURL("http://localhost:5183");
  } else {
    win.loadFile(path.join(__dirname, "../dist/renderer/index.html"));
  }
}

app.whenReady().then(() => {
  protocol.handle("media", (req) => {
    const file = decodeURIComponent(new URL(req.url).pathname);
    return net.fetch(pathToFileURL(file).toString(), { headers: req.headers });
  });
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
