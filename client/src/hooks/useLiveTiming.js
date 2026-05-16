import { useEffect, useRef, useState, useCallback } from "react";
import { fetchEvent } from "../api";

export function useLiveTiming(eventId, intervalMs = 5000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const abortRef = useRef(null);

  const tick = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const json = await fetchEvent(eventId, ctrl.signal);
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [tick, intervalMs]);

  return { data, loading, error, lastUpdated, refresh: tick };
}
