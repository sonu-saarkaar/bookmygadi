import { useEffect } from "react";

export const usePolling = (fn: () => void | Promise<void>, ms: number, deps: unknown[] = []) => {
  useEffect(() => {
    fn();
    const id = window.setInterval(() => fn(), ms);
    return () => window.clearInterval(id);
  }, deps);
};
