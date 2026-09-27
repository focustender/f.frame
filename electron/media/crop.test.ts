import { test } from "node:test";
import assert from "node:assert/strict";
import { planCrop, parseRatio } from "./crop";

const RATIOS = ["21:9", "16:9", "3:2", "4:3", "1:1", "4:5", "3:4", "9:16"];
const SOURCES: [string, number, number][] = [
  ["landscape 4032x3024", 4032, 3024],
  ["portrait 1080x1920", 1080, 1920],
  ["square 800x800", 800, 800],
  ["odd gif 481x271", 481, 271],
];

for (const [label, w, h] of SOURCES) {
  for (const ratio of RATIOS) {
    for (const even of [false, true]) {
      test(`${label} -> ${ratio}${even ? " (even)" : ""}`, () => {
        const [rw, rh] = parseRatio(ratio);
        for (const offset of [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }]) {
          const p = planCrop(w, h, ratio, offset, 1920, even);
          // crop stays inside the source
          assert.ok(p.cropX >= 0 && p.cropY >= 0);
          assert.ok(p.cropX + p.cropW <= w && p.cropY + p.cropH <= h);
          // one crop edge is always the full source edge (cover, not pad)
          assert.ok(p.cropW === w || p.cropH === h);
          // output ratio within rounding
          assert.ok(Math.abs(p.outW / p.outH - rw / rh) < 0.02, `${p.outW}x${p.outH}`);
          // no upscale, max edge respected
          assert.ok(Math.max(p.outW, p.outH) <= 1920);
          assert.ok(p.outW <= p.cropW + 1 && p.outH <= p.cropH + 1);
          if (even) assert.ok(p.outW % 2 === 0 && p.outH % 2 === 0);
        }
      });
    }
  }
}

test("offset moves the crop window to the far edge", () => {
  const p = planCrop(4000, 1000, "1:1", { x: 1, y: 0 }, 1920);
  assert.equal(p.cropX, 3000);
  assert.equal(p.cropW, 1000);
});
