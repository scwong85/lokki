type Handler<T> = (payload: T) => void;

/** Tiny typed event bus. `Events` maps event name -> payload type. */
export class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(name: K, fn: Handler<Events[K]>): () => void {
    let set = this.handlers.get(name);
    if (!set) this.handlers.set(name, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set.delete(fn as Handler<never>);
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    this.handlers.get(name)?.forEach((fn) => (fn as Handler<Events[K]>)(payload));
  }
}

export interface GameEvents extends Record<string, unknown> {
  ready: undefined;
  tuningChanged: undefined;
}

export const events = new EventBus<GameEvents>();
