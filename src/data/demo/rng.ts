/** Deterministic mulberry32 PRNG for reproducible demo seeds. */
export function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) {
    throw new Error("Cannot pick from an empty list");
  }
  return item;
}

export function pickWeighted<T>(rng: () => number, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let target = rng() * total;
  for (const item of items) {
    target -= weight(item);
    if (target < 0) return item;
  }
  return pick(rng, items);
}

export function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
