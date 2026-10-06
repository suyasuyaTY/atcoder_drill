import type { DifficultyBand } from "../lib/difficulty";

/** 色帯 → 背景のクラス（Tailwind が見つけられるよう、クラス名は省略せずに書く） */
export const BAND_BG: Record<DifficultyBand, string> = {
  gray: "bg-diff-gray",
  brown: "bg-diff-brown",
  green: "bg-diff-green",
  cyan: "bg-diff-cyan",
  blue: "bg-diff-blue",
  yellow: "bg-diff-yellow",
  orange: "bg-diff-orange",
  red: "bg-diff-red",
};
