/**
 * Immutable-update helper for arrays.
 * Returns a new array with the element at `index` replaced by `newItem`.
 */
export function replaceAt<T>(arr: T[], index: number, newItem: T): T[] {
  const copy = arr.slice();
  copy[index] = newItem;
  return copy;
}

/**
 * Immutable-update helper for arrays.
 * Returns a new array with the element at `index` removed.
 */
export function removeAt<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index);
}
