/** Shared decode budget, not a prefetcher. Work only exists for mounted frames. */
export const PHOTO_CANDIDATE_TIMEOUT_MS = 15_000;
export function createCandidateQueue(limit = 4) {
  let active = 0;
  const waiting: { start: () => void; cancelled: boolean }[] = [];
  const drain = () => {
    while (active < limit && waiting.length) {
      const next = waiting.shift()!;
      if (next.cancelled) continue;
      active++; next.start();
    }
  };
  return {
    acquire(start: () => void) {
      let running = false, released = false;
      const item = { cancelled: false, start: () => { running = true; start(); } };
      waiting.push(item); drain();
      return () => {
        if (released) return;
        released = true; item.cancelled = true;
        if (running) active--;
        const index = waiting.indexOf(item);
        if (index >= 0) waiting.splice(index, 1);
        drain();
      };
    },
  };
}
export const photoCandidateQueue = createCandidateQueue();
