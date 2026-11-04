let operation: Promise<unknown> = Promise.resolve();
// One installation can be touched by token refresh, logout and a settings tap.
export function serializeNotificationWrite<T>(read: () => Promise<T>): Promise<T> {
  const next = operation.catch(() => undefined).then(read);
  operation = next;
  return next;
}
