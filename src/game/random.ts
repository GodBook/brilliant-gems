export function normalizeSeed(seed: number): number {
  const normalized = Math.trunc(seed) >>> 0
  return normalized === 0 ? 0x6d2b79f5 : normalized
}

export function nextRandom(state: number): { state: number; value: number } {
  let next = normalizeSeed(state)
  next ^= next << 13
  next ^= next >>> 17
  next ^= next << 5
  next >>>= 0
  return { state: next, value: next / 0x100000000 }
}

export function shuffleWithSeed<T>(items: readonly T[], seed: number): { items: T[]; state: number } {
  const result = [...items]
  let state = normalizeSeed(seed)
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = nextRandom(state)
    state = random.state
    const swapIndex = Math.floor(random.value * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return { items: result, state }
}

export function randomIndex(seed: number, length: number): { index: number; state: number } {
  const random = nextRandom(seed)
  return {
    index: Math.min(length - 1, Math.floor(random.value * length)),
    state: random.state
  }
}

