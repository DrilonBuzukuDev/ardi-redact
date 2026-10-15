import type { Progress } from "../types/setup";
import { useEffect, useRef, useState } from "react";
import {
  cancelSetup,
  getSetupStatus,
  onSetupProgress,
  prepareEngine,
} from "../api/setup";

export function useSetup() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Progress>({
    stage: "Preparing setup",
    percent: 0,
  });
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    const off = onSetupProgress((value) => {
      if (active) setProgress(value);
    });
    void getSetupStatus()
      .then((status) => {
        if (active) setReady(status.ready);
      })
      .catch((cause) => {
        if (active)
          setError(String(cause instanceof Error ? cause.message : cause));
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      off();
    };
  }, []);
  const run = async () => {
    if (locked.current || checking) return;
    locked.current = true;
    setReady(false);
    setBusy(true);
    setError("");
    setProgress({ stage: "Preparing setup", percent: 0 });
    try {
      await prepareEngine();
      setReady(true);
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const cancel = async () => {
    try {
      await cancelSetup();
    } catch {
      setError("Could not cancel setup. Close the app to stop it.");
    }
  };
  return { ready, checking, busy, error, progress, run, cancel };
}
