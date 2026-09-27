// Shared crop math. The renderer mirrors this with CSS object-fit: cover +
// object-position: {x*100}% {y*100}%, which places the crop window at exactly
// (srcW - cropW) * x, so preview and export agree.

export interface Offset {
  x: number; // 0 = left edge, 1 = right edge
  y: number; // 0 = top edge, 1 = bottom edge
}

export interface CropPlan {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  outW: number;
  outH: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const toEven = (n: number) => Math.max(2, Math.floor(n / 2) * 2);

export function parseRatio(ratio: string): [number, number] {
  const [w, h] = ratio.split(":").map(Number);
  if (!(w > 0 && h > 0)) throw new Error(`Bad ratio: ${ratio}`);
  return [w, h];
}

export function planCrop(
  srcW: number,
  srcH: number,
  ratio: string,
  offset: Offset,
  maxEdge: number,
  even = false
): CropPlan {
  const [rw, rh] = parseRatio(ratio);
  const target = rw / rh;

  let cropW: number;
  let cropH: number;
  if (srcW / srcH > target) {
    cropH = srcH;
    cropW = Math.min(srcW, Math.round(srcH * target));
  } else {
    cropW = srcW;
    cropH = Math.min(srcH, Math.round(srcW / target));
  }

  const cropX = Math.round((srcW - cropW) * clamp01(offset.x));
  const cropY = Math.round((srcH - cropH) * clamp01(offset.y));

  // Never upscale: the long edge is capped by both maxEdge and the crop itself.
  let outW: number;
  let outH: number;
  if (rw >= rh) {
    outW = Math.min(maxEdge, cropW);
    outH = (outW * rh) / rw;
  } else {
    outH = Math.min(maxEdge, cropH);
    outW = (outH * rw) / rh;
  }

  return {
    cropX,
    cropY,
    cropW,
    cropH,
    outW: even ? toEven(outW) : Math.round(outW),
    outH: even ? toEven(outH) : Math.round(outH),
  };
}
