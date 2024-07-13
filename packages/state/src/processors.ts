import { ActionProcessor as IActionProcessor } from '@diax-js/common/state';
import { AbstractAction, ComputationAction, EffectAction, RenderingAction } from './actions';
import { Queue } from './util/queue';
import { CountLock } from './util/lock';

export abstract class ActionProcessor<T extends AbstractAction> implements IActionProcessor<T> {
  abstract process(action: T): void;

  protected abstract execute(): void;

  protected abstract put(action: T): void;

  protected callSafe(action: T) {
    try {
      action.call();
    } catch (err) {
      reportError(err);
    } finally {
      action.unlock();
    }
  }
}

abstract class AbstractEffectProcessor<T extends AbstractAction> extends ActionProcessor<T> {
  protected actionsQueue: Queue<T> = new Queue();
  protected countLock: CountLock = new CountLock();

  constructor() {
    super();
    this.execute = this.execute.bind(this);
  }

  protected abstract getQueue(): Queue<T>;

  protected put(action: T): void {
    action.lock();
    this.countLock.lock();
    this.actionsQueue.enqueue(action);
  }

  protected override execute(): void {
    if (!this.countLock.isLocked) {
      const queue = this.getQueue();
      while (!queue.isEmpty()) {
        this.callSafe(this.actionsQueue.dequeue());
      }
    }
    this.countLock.unlock();
  }
}

export class ComputationProcessor extends ActionProcessor<ComputationAction> {
  private readonly computationBudged = 1000;
  private currentComputation = 0;

  private currentAction: ComputationAction | null = null;

  override process(action: ComputationAction): void {
    const previousAction = this.currentAction;
    try {
      this.put(action);
      this.execute();
    } finally {
      this.currentComputation = 0;
      this.currentAction = previousAction;
    }
  }

  protected override put(action: ComputationAction): void {
    this.currentComputation++;
    if (this.computationBudged === this.currentComputation) {
      throw new RangeError(`Computation budged (${this.computationBudged}) exceeded.`);
    }
    this.currentAction = action;
  }

  protected override execute(): void {
    if (this.currentAction) {
      this.callSafe(this.currentAction);
    }
    this.currentComputation--;
  }
}

export class EffectProcessor extends AbstractEffectProcessor<EffectAction> {
  override process(action: EffectAction): void {
    this.put(action);
    queueMicrotask(this.execute);
  }

  protected override getQueue(): Queue<EffectAction> {
    return this.actionsQueue;
  }
}

export class RenderingProcessor extends AbstractEffectProcessor<RenderingAction> {
  private isRendering: boolean = false;

  protected override put(action: RenderingAction): void {
    if (this.isRendering) {
      this.isRendering = false;
      throw new Error(`Detected state change or RenderingAction request while page is rendering.`);
    }
    super.put(action);
  }

  override process(action: RenderingAction): void {
    this.put(action);
    setTimeout(this.execute);
  }

  protected override getQueue(): Queue<RenderingAction> {
    return this.actionsQueue.sorted(this.topologicalComparator);
  }

  private topologicalComparator(a: RenderingAction, b: RenderingAction): number {
    if (a === b) {
      return 0;
    }
    const position = a.host.compareDocumentPosition(b.host);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    } else {
      return 0;
    }
  }
}
