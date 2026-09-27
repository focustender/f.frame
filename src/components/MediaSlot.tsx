import { useRef } from "react";
import type { ExportProgress, MediaInfo } from "../../electron/types";
import { ratioValue } from "../ratios";
import "./MediaSlot.css";

type Offset = { x: number; y: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const mediaUrl = (file: string) => `media://local${encodeURI(file)}`;

// Figma "Module / Media" (16:655). Width-driven; height follows the ratio.
export function MediaSlot({
  ratio,
  media,
  selected,
  offset,
  progress,
  onToggle,
  onOffset,
  onReveal,
}: {
  ratio: string;
  media: MediaInfo | null;
  selected: boolean;
  offset: Offset;
  progress?: ExportProgress;
  onToggle: () => void;
  onOffset: (o: Offset) => void;
  onReveal: (file: string) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; start: Offset } | null>(null);

  // Mirror of planCrop: with object-fit: cover, the image overflows the frame on one
  // axis by `excess` px, and object-position p% shifts it by excess * p.
  const excess = () => {
    const el = frame.current;
    if (!el || !media) return { x: 0, y: 0 };
    const { width: fw, height: fh } = el.getBoundingClientRect();
    const scale = Math.max(fw / media.width, fh / media.height);
    return { x: media.width * scale - fw, y: media.height * scale - fh };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!media) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: offset };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const ex = excess();
    const { x, y, start } = drag.current;
    onOffset({
      x: ex.x > 0.5 ? clamp01(start.x - (e.clientX - x) / ex.x) : start.x,
      y: ex.y > 0.5 ? clamp01(start.y - (e.clientY - y) / ex.y) : start.y,
    });
  };
  const endDrag = () => (drag.current = null);

  const position = `${offset.x * 100}% ${offset.y * 100}%`;
  const label = `Media · ${ratio}`;
  const status = progress?.status;

  return (
    <figure className={`slot ${selected ? "slot--selected" : ""} ${media ? "slot--loaded" : ""}`}>
      <div
        ref={frame}
        className="slot__frame"
        style={{ aspectRatio: ratioValue(ratio) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => media && onOffset({ x: 0.5, y: 0.5 })}
        title={media ? "Drag to reposition, double-click to center" : undefined}
      >
        {!media && <p className="slot__label">{label}</p>}
        {media?.kind === "video" && (
          <video className="slot__media" src={mediaUrl(media.previewPath)} style={{ objectPosition: position }} autoPlay muted loop playsInline />
        )}
        {media && media.kind !== "video" && (
          <img className="slot__media" src={mediaUrl(media.previewPath)} style={{ objectPosition: position }} alt="" draggable={false} />
        )}
        {status === "running" && (
          <div className="slot__progress" style={{ transform: `scaleX(${progress!.pct})` }} />
        )}
      </div>

      <figcaption className="slot__caption t-body">
        <label className="slot__toggle">
          <input type="checkbox" checked={selected} onChange={onToggle} />
          <span>{ratio}</span>
        </label>
        {status === "running" && <span className="slot__status">{Math.round(progress!.pct * 100)}%</span>}
        {status === "done" && progress?.outputs?.[0] && (
          <button type="button" className="slot__status slot__status--link" onClick={() => onReveal(progress.outputs![0])}>
            Done · Reveal
          </button>
        )}
        {status === "error" && (
          <span className="slot__status slot__status--error" title={progress?.error}>
            Failed
          </span>
        )}
      </figcaption>
    </figure>
  );
}
