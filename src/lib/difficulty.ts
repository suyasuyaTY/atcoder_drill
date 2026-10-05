/**
 * difficulty の表示用の補正と色帯（SPEC §10.1）。値は AtCoder Problems の推定値。
 */

export type DifficultyBand = "gray" | "brown" | "green" | "cyan" | "blue" | "yellow" | "orange" | "red";

/** 補正後の値の下限ごとの色帯。易しい順 */
export const DIFFICULTY_BANDS: readonly { band: DifficultyBand; min: number }[] = [
  { band: "gray", min: -Infinity },
  { band: "brown", min: 400 },
  { band: "green", min: 800 },
  { band: "cyan", min: 1200 },
  { band: "blue", min: 1600 },
  { band: "yellow", min: 2000 },
  { band: "orange", min: 2400 },
  { band: "red", min: 2800 },
];

export const DIFFICULTY_SOURCE = "AtCoder Problems 推定値";

/** 生の difficulty → 表示値。400 未満は 400 / exp((400 - d) / 400) で正の値に寄せる。整数に丸める */
export function displayDifficulty(raw: number | null): number | null {
  if (raw === null) return null;
  const d = raw >= 400 ? raw : 400 / Math.exp((400 - raw) / 400);
  return Math.round(d);
}

/** 補正後の値 → 色帯。NULL は灰 */
export function difficultyBand(disp: number | null): DifficultyBand {
  if (disp === null) return "gray";
  let band: DifficultyBand = "gray";
  for (const b of DIFFICULTY_BANDS) {
    if (disp >= b.min) band = b.band;
  }
  return band;
}
