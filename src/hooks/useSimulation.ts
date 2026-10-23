import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { compareClinicalState, type ClinicalEvolution } from "../clinical";
import type { Simulation } from "../types";
export function useSimulation(id: string) {
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [evolution, setEvolution] = useState<ClinicalEvolution | null>(null);
  const generation = useRef(0);
  const latestRead = useRef(0);
  const actionInFlight = useRef(false);
  const pollingInFlight = useRef(false);
  const latestState = useRef<Simulation | null>(null);
  const clockAnchor = useRef<{ seconds: number; at: number } | null>(null);
  const expiryRefreshRequested = useRef(false);
  const acceptState = useCallback((state: Simulation) => {
    const change = compareClinicalState(latestState.current, state);
    if (change) setEvolution(change);
    latestState.current = state;
    clockAnchor.current = {
      seconds: state.remaining_seconds,
      at: performance.now(),
    };
    expiryRefreshRequested.current = false;
    setRemainingSeconds(state.remaining_seconds);
    setSimulation(state);
  }, []);
  const refresh = useCallback(
    async (quiet = false) => {
      if (!id) return;
      const currentGeneration = generation.current;
      const read = ++latestRead.current;
      if (!quiet) setLoading(true);
      try {
        const state = await api.simulation(id);
        if (
          currentGeneration === generation.current &&
          read === latestRead.current
        ) {
          acceptState(state);
          setError("");
        }
      } catch (reason) {
        if (
          currentGeneration === generation.current &&
          read === latestRead.current
        ) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Falha ao carregar a simulação.",
          );
        }
      } finally {
        if (!quiet && currentGeneration === generation.current)
          setLoading(false);
      }
    },
    [id, acceptState],
  );
  useEffect(() => {
    latestState.current = null;
    clockAnchor.current = null;
    setSimulation(null);
    setEvolution(null);
    setLoading(true);
    void refresh();
    return () => {
      generation.current += 1;
      latestRead.current += 1;
    };
  }, [refresh]);
  useEffect(() => {
    if (!simulation?.is_running) return;
    const timer = window.setInterval(() => {
      if (actionInFlight.current || pollingInFlight.current || document.visibilityState !== "visible") return;
      pollingInFlight.current = true;
      void refresh(true).finally(() => { pollingInFlight.current = false; });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [simulation?.is_running, refresh]);
  useEffect(() => {
    if (!simulation?.is_running) return;
    const update = () => {
      const anchor = clockAnchor.current;
      if (!anchor) return;
      const seconds = Math.max(
        0,
        Math.ceil(anchor.seconds - (performance.now() - anchor.at) / 1000),
      );
      setRemainingSeconds(seconds);
      if (
        seconds === 0 &&
        !expiryRefreshRequested.current &&
        !actionInFlight.current
      ) {
        expiryRefreshRequested.current = true;
        void refresh(true);
      }
    };
    const timer = window.setInterval(update, 250);
    update();
    return () => window.clearInterval(timer);
  }, [simulation?.is_running, refresh]);
  useEffect(() => {
    if (!simulation?.is_running) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && !actionInFlight.current)
        void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [simulation?.is_running, refresh]);
  const beginAction = useCallback(() => {
    if (actionInFlight.current) return false;
    actionInFlight.current = true;
    generation.current += 1;
    return true;
  }, []);
  const commit = useCallback(
    (state: Simulation) => {
      generation.current += 1;
      acceptState(state);
      setError("");
    },
    [acceptState],
  );
  const endAction = useCallback(() => {
    actionInFlight.current = false;
  }, []);
  return {
    simulation,
    remainingSeconds,
    evolution,
    loading,
    error,
    setError,
    refresh,
    beginAction,
    commit,
    endAction,
  };
}
