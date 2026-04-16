export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function range(start: number, stop: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
    result.push(i);
  }
  return result;
}

export function zip<A, B>(a: A[], b: B[]): Array<[A, B]> {
  const n = Math.min(a.length, b.length);
  const result: Array<[A, B]> = [];
  for (let i = 0; i < n; i++) result.push([a[i], b[i]]);
  return result;
}

export function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of arr) (predicate(item) ? yes : no).push(item);
  return [yes, no];
}

export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

export function compact<T>(arr: Array<T | null | undefined | false | 0 | "">): T[] {
  return arr.filter(Boolean) as T[];
}
