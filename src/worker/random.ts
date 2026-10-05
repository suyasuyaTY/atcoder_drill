import type { Rng } from "../lib/scheduler";

/** draw() に渡す乱数。crypto.getRandomValues から [0, 1) を作る */
export const cryptoRng: Rng = () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! / 2 ** 32;
};
