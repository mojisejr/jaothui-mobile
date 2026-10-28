let generation = 0;
let writes: Promise<unknown> = Promise.resolve();
export const currentSessionGeneration = () => generation;
export const advanceSessionGeneration = () => ++generation;
export function serializeAuthWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writes.catch(() => undefined).then(operation);
  writes = next;
  return next;
}
