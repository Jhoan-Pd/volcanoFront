"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import axios from "axios";
import { errorMessage } from "@/api/client";
import { reportNetworkFailure, SERVER_READY_EVENT } from "./serverStatus";

export interface AsyncData<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Load asynchronous data and expose { data, error, loading, reload }.
 *
 * It replaces the repeated useEffect + several useState + .then/.catch pattern and fixes its race
 * condition: when the user switches municipality quickly, an old response arriving late is dropped
 * instead of overwriting the new one.
 * When `load` is null (something it depends on is not ready yet) it does nothing.
 * `reload()` fetches again while keeping the current data on screen (no flicker).
 */
export function useData<T>(load: (() => Promise<T>) | null, deps: DependencyList): AsyncData<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>(
    { data: null, error: null, loading: load != null });
  const [version, setVersion] = useState(0);
  const previousVersion = useRef(version);

  useEffect(() => {
    const isReload = previousVersion.current !== version;
    previousVersion.current = version;
    if (!load) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    let current = true;
    setState((s) => ({ data: isReload ? s.data : null, error: null, loading: true }));
    load()
      .then((data) => { if (current) setState({ data, error: null, loading: false }); })
      .catch((e) => {
        // No response (network or timeout): the API is probably waking up
        if (axios.isAxiosError(e) && !e.response) reportNetworkFailure();
        if (current) setState({ data: null, error: errorMessage(e), loading: false });
      });
    return () => { current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller defines the dependencies
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  // When the load failed while the server was asleep, retry by itself as soon as it wakes up
  const failed = state.error != null;
  useEffect(() => {
    if (!failed) return;
    window.addEventListener(SERVER_READY_EVENT, reload);
    return () => window.removeEventListener(SERVER_READY_EVENT, reload);
  }, [failed, reload]);

  return { ...state, reload };
}
