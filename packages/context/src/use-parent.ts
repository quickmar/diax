import { CONTEXT, Context, NoArgType } from '@items/common';
import { getCurrentContext } from './context';
import { hasContext, instantiate } from './utils/util';
import { DocumentContext } from './document-context';

export function useParent<T>(type: NoArgType<T>, skipSelf?: boolean): T {
  const currentContext = getCurrentContext();
  for (const context of contextIterator(currentContext, skipSelf)) {
    if (context.dependencies.hasInstance(type)) {
      return context.dependencies.getInstance(type);
    }
  }
  return instantiate(currentContext, type);
}

function* contextIterator(context: Context, skipSelf = false) {
  const hostElement = context.dependencies.getInstance(HTMLElement);
  let element = skipSelf ? hostElement.parentElement : hostElement;
  do {
    if (element && hasContext(element)) {
      yield element[CONTEXT];
    }
    element = element?.parentElement ?? null;
  } while (element !== document.body);
  yield DocumentContext.create();
  return null;
}