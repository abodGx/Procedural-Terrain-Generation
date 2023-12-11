class EventListener {

    listeners = new Set();

    constructor() {
    }

    addEventListener(callable) {
        this.listeners.add(callable);
    }

    fireEvent(...args) {
        for (const listener of this.listeners) listener.call(null, ...args);
    }

    removeEventListener(callable) {
        this.listeners.delete(callable);
    }
}