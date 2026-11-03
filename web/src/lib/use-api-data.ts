"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

export function useApiData<T>(path: string) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    apiGet<T>(path).then(
      (data) => {
        if (active) setState({ status: "ready", data });
      },
      (error: Error) => {
        if (active) setState({ status: "error", message: error.message });
      },
    );
    return () => {
      active = false;
    };
  }, [path, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry };
}
