import { Cleanable } from '../destroying/model';
import { TargetCallbacks } from '../custom-element/model';
import { Type } from '../model/common';
import { SubscriptionMode, Signal, Subscription } from '../state/model';

export const CONTEXT = Symbol.for('@@context');

export interface Context<T extends TargetCallbacks = TargetCallbacks> extends Cleanable {
  readonly host: HTMLElement;
  readonly observedAttributes: Set<string>;
  attributes: Record<string, Signal<string> | null>;
  instance: T;
  subscriptionMode: SubscriptionMode | null;
  observables: Set<Signal<unknown>>;
  ownedSubscriptions: Set<Subscription>;
  dependencies: Dependencies;
  destroy(): void;
}

export interface Dependencies extends Cleanable {
  getInstance<T>(index: Token<T>): T;
  setInstance<T>(index: Token<T>, instance: T | null): void;
  hasInstance<T>(index: Token<T>): boolean;
  removeInstance<T>(index: Token<T>): void;
}

export interface ContextNode extends Node {
  readonly [CONTEXT]: Context;
}

export interface ContextElement extends Element {
  readonly [CONTEXT]: Context;
}

export interface ContextHTMLElement extends HTMLElement {
  readonly [CONTEXT]: Context;
}

export const DI_TOKEN = Symbol.for('@@token');

interface _Token<T> {
  type: Type<T>;
  name: string;
  readonly di_index: number;
}

export interface Token<T> extends Omit<_Token<T>, 'type'> {}