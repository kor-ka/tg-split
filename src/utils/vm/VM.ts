export class VM<T> {
  val: T;
  private listeners = new Set<(val: T) => void>();
  constructor(val: T) {
    this.val = val;
  }

  next = (val: T) => {
    this.val = val;
    for (let listener of this.listeners) {
      listener(val);
    }
  };

  subscribe = (listener: (val: T) => void) => {
    this.listeners.add(listener);
    listener(this.val);
    return () => {
      this.listeners.delete(listener);
    };
  };
}
