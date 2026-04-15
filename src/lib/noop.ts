export function noop(): void {}
export function identity<T>(value: T): T { return value; }
export async function asyncNoop(): Promise<void> {}
