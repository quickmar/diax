import { ActionProcessor, Action } from '@diax-js/common';
import { ComputationAction, EffectAction } from './actions';

export abstract class AbstractActionProcessor<T extends Action> implements ActionProcessor<T> {
  abstract process(action: T): void;

  protected abstract execute(): void;

  protected abstract put(action: T): void;

  protected callSafe(action: T) {
    try {
      action.call();
    } catch (err) {
      reportError(err);
    }
  }
}

export class ComputationProcessor extends AbstractActionProcessor<ComputationAction> {
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
      throw new Error('Possible computation cycle detected');
    }
    this.currentAction = action;
  }

  protected override execute(): void {
    if (this.currentAction) this.callSafe(this.currentAction);
  }
}

export class EffectProcessor extends AbstractActionProcessor<EffectAction> {
  private actions: Set<EffectAction> = new Set();

  constructor() {
    super();
    this.execute = this.execute.bind(this);
  }

  override process(action: EffectAction): void {
    this.put(action);
    queueMicrotask(this.execute);
  }

  protected execute(): void {
    if (this.actions.size === 0) return;
    const actions = this.actions;
    this.actions = new Set();
    for (const action of actions) {
      this.callSafe(action);
    }
    requestIdleCallback(() => actions.clear());
  }

  protected put(action: EffectAction): void {
    this.actions.add(action);
  }
}
