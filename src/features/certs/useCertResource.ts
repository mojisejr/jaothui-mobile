import { useCallback, useEffect, useRef, useState } from "react";

type Resource<T> =
  | { status: "idle" | "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: unknown };

// Each detail screen is keyed by its microchip. Its independent reads end on unmount.
export function useCertResource<T>(
  microchip: string,
  read: (microchip: string, signal: AbortSignal) => Promise<T>,
  automatic = true,
) {
  const [state, setState] = useState<Resource<T>>({ status: automatic ? "loading" : "idle" });
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (!microchip || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: "loading" });
    const timeout = setTimeout(() => {
      if (request.current !== controller) return;
      request.current = null;
      controller.abort();
      setState({ status: "error", error: new Error("timeout") });
    }, 30_000);
    try {
      const data = await read(microchip, controller.signal);
      if (request.current === controller) setState({ status: "success", data });
    } catch (error) {
      if (request.current === controller) setState({ status: "error", error });
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  }, [microchip, read]);

  useEffect(() => {
    if (automatic) void load();
    return () => {
      const controller = request.current;
      request.current = null;
      controller?.abort();
    };
  }, [automatic, load]);
  return { state, load };
}
