import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: Error };

export function useAsyncResource<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    status: "loading",
    data: null,
    error: null,
  });

  const run = useCallback(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });

    loader()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data, error: null });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loader]);

  const reload = useCallback(() => {
    run();
  }, [run]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const id = setTimeout(() => {
      cleanup = run();
    }, 0);

    return () => {
      clearTimeout(id);
      cleanup?.();
    };
  }, [run]);

  return { ...state, reload };
}
