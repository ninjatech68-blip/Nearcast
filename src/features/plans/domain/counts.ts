const FEW_BELOW = 5;

function assertCount(value: number): void {
  if (!Number.isInteger(value) || value < 0) throw new Error(`invalid count: ${value}`);
}

/**
 * A count of people the viewer cannot see individually (density, arrivals,
 * reach). Small numbers become "a few" so they can't single anyone out.
 */
export function aggregatePeople(count: number): string | null {
  assertCount(count);
  if (count === 0) return null;
  return count < FEW_BELOW ? 'a few' : String(count);
}

/**
 * "3 going" on a plan the viewer can see. Exact, because the same people are
 * shown in the avatar stack next to it.
 */
export function goingLabel(count: number): string | null {
  assertCount(count);
  return count === 0 ? null : `${count} going`;
}

/** A reach estimate from the server: `'few'` or a rounded integer. */
export function estimateLabel(bucket: 'few' | number): string | null {
  if (bucket === 'few') return 'a few';
  assertCount(bucket);
  return bucket === 0 ? null : `≈ ${bucket}`;
}

export function spotsLabel(capacity: number | null, goingCount: number): string {
  assertCount(goingCount);
  if (capacity === null) return 'No limit';
  const left = capacity - goingCount;
  if (left <= 0) return 'Full';
  return left === 1 ? '1 spot left' : `${left} spots left`;
}
