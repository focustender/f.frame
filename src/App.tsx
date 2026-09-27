import { useCallback, useEffect, useState } from "react";
import type { ExportProgress, MediaInfo, Quality } from "../electron/types";
import { RATIOS } from "./ratios";
import { MediaSlot } from "./components/MediaSlot";
import { ExitButton, PillButton } from "./components/PillButton";
import "./App.css";

type Offset = { x: number; y: number };
const CENTER: Offset = { x: 0.5, y: 0.5 };
const MAX_EDGES = [3840, 2560, 1920, 1280, 960, 640];
const basename = (p: string) => p.split("/").pop() ?? p;

export default function App() {
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(["16:9"]));
  const [offsets, setOffsets] = useState<Record<string, Offset>>({});
  const [progress, setProgress] = useState<Record<string, ExportProgress>>({});
  const [exporting, setExporting] = useState(false);
  const [maxEdge, setMaxEdge] = useState(1920);
  const [quality, setQuality] = useState<Quality>("balanced");
  const [stripAudio, setStripAudio] = useState(false);
  const [outDir, setOutDir] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    window.fframe.defaultFolder().then(setOutDir);
  }, []);

  const load = useCallback(async (file: string | null) => {
    if (!file) return;
    setError(null);
    try {
      const info = await window.fframe.probe(file);
      setMedia(info);
      setOffsets({});
      setProgress({});
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "") : String(e));
    }
  }, []);

  useEffect(() => {
    window.fframe.pendingOpen().then(load);
    return window.fframe.onOpenPath(load);
  }, [load]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) load(window.fframe.pathForFile(file));
  };

  const toggle = (ratio: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(ratio) ? next.delete(ratio) : next.add(ratio);
      return next;
    });

  const runExport = async () => {
    if (!media || selected.size === 0) return;
    setExporting(true);
    setProgress({});
    try {
      await window.fframe.exportMedia(
        {
          media,
          items: RATIOS.filter((r) => selected.has(r)).map((ratio) => ({ ratio, offset: offsets[ratio] ?? CENTER })),
          outDir,
          maxEdge,
          quality,
          stripAudio,
        },
        (p) => setProgress((prev) => ({ ...prev, [p.ratio]: p }))
      );
    } finally {
      setExporting(false);
    }
  };

  const pickFolder = async () => {
    const dir = await window.fframe.pickFolder();
    if (dir) setOutDir(dir);
  };

  return (
    <div
      className={`app ${dragOver ? "app--dragover" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragOver(false)}
      onDrop={onDrop}
    >
      <header className="bar">
        <div className="bar__group">
          <h1 className="bar__title">f.frame</h1>
          {media ? (
            <>
              <span className="bar__file t-body" title={media.path}>
                {basename(media.path)} · {media.width}×{media.height}
                {media.kind !== "image" && ` · ${media.duration.toFixed(1)}s`}
              </span>
              <ExitButton onClick={() => setMedia(null)} />
            </>
          ) : (
            <>
              <PillButton onClick={async () => load(await window.fframe.openMedia())} title="Add media" />
              <span className="bar__hint t-body">Drop a photo, video or GIF anywhere</span>
            </>
          )}
          {error && <span className="bar__error t-body">{error}</span>}
        </div>

        <div className="bar__group t-body">
          <label className="field">
            <span>Max edge</span>
            <select value={maxEdge} onChange={(e) => setMaxEdge(Number(e.target.value))}>
              {MAX_EDGES.map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Quality</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
              <option value="balanced">Balanced</option>
              <option value="small">Smallest</option>
            </select>
          </label>
          {media?.kind === "video" && media.hasAudio && (
            <label className="field">
              <input type="checkbox" checked={stripAudio} onChange={(e) => setStripAudio(e.target.checked)} />
              <span>Strip audio</span>
            </label>
          )}
          <button type="button" className="field field--folder" onClick={pickFolder} title={outDir}>
            <span>To</span>
            <span className="field__value">{basename(outDir)}</span>
          </button>
          <PillButton
            label={exporting ? "Exporting" : `Export ${selected.size || ""}`.trim()}
            onClick={runExport}
            disabled={!media || selected.size === 0 || exporting}
          />
        </div>
      </header>

      <main className="grid">
        {RATIOS.map((ratio) => (
          <MediaSlot
            key={ratio}
            ratio={ratio}
            media={media}
            selected={selected.has(ratio)}
            offset={offsets[ratio] ?? CENTER}
            progress={progress[ratio]}
            onToggle={() => toggle(ratio)}
            onOffset={(o) => setOffsets((prev) => ({ ...prev, [ratio]: o }))}
            onReveal={window.fframe.reveal}
          />
        ))}
      </main>
    </div>
  );
}
