// Module / Media variants (Figma 16:655), in Figma order.
export const RATIOS = ["21:9", "16:9", "3:2", "4:3", "1:1", "4:5", "3:4", "9:16"] as const;
export type Ratio = (typeof RATIOS)[number];

export const ratioValue = (r: string) => {
  const [w, h] = r.split(":").map(Number);
  return w / h;
};
