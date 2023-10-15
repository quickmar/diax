import { Context, Dependencies, NoArgType } from "@items/common";

let index = 0;

export class ElementContext implements Context {
  i = index++;

  constructor(node?: Node) {
    if (node instanceof HTMLElement) {
      this.dependencies.setInstance(HTMLElement, node);
    }
  }
  readonly dependencies: Dependencies = new BaseDependencies();
}

export class BaseDependencies implements Dependencies {
  #dependencies = new Map<NoArgType<unknown>, unknown>();

  getInstance<T>(type: NoArgType<T>): T {
    const instance = this.#dependencies.get(type);
    if (instance === null) throw new ReferenceError(`Cyclic dependency detected! ${type}`);
    if (!instance) throw new ReferenceError(`For type ${type} dependency is not defined`);
    if (!(instance instanceof type)) {
      this.throwNotInstanceOf(type, instance);
    }
    return instance;
  }

  setInstance<T>(type: NoArgType<T>, instance: T | null): void {
    if (!(instance instanceof type) && instance !== null) {
      this.throwNotInstanceOf(type, instance);
    }
    if (!this.#dependencies.has(type)) {
      this.#dependencies.set(type, instance);
    }
  }

  hasInstance<T>(type: NoArgType<T>): boolean {
    return this.#dependencies.has(type);
  }

  removeInstance<T>(type: NoArgType<T>): void {
    this.#dependencies.delete(type);
  }

  private throwNotInstanceOf(type: NoArgType<unknown>, instance: unknown): never {
    throw new Error(`${instance} is not instanceof ${type}`);
  }
}
