type EventMap = Record<string, unknown[]>;
type Listener<T extends unknown[]> = (...args: T) => void;

export class TypedEmitter<Events extends EventMap> {
  private listeners = new Map<keyof Events, Set<Listener<unknown[]>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<unknown[]>);
    return () => set.delete(listener as Listener<unknown[]>);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
