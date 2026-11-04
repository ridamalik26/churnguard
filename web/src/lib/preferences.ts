"use client";

import { useSyncExternalStore } from "react";

const SAMPLE_SIZE_KEY = "churnguard:sample-size";
const SAMPLE_SIZE_CHANGE_EVENT = "churnguard:sample-size-change";
export const SAMPLE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_SAMPLE_SIZE = 25;

function subscribe(onChange: () => void) {
  window.addEventListener(SAMPLE_SIZE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(SAMPLE_SIZE_CHANGE_EVENT, onChange);
}

function readSampleSize(): number {
  try {
    const stored = Number(localStorage.getItem(SAMPLE_SIZE_KEY));
    return SAMPLE_SIZE_OPTIONS.includes(stored as (typeof SAMPLE_SIZE_OPTIONS)[number]) ? stored : DEFAULT_SAMPLE_SIZE;
  } catch {
    return DEFAULT_SAMPLE_SIZE;
  }
}

function readSampleSizeOnServer() {
  return DEFAULT_SAMPLE_SIZE;
}

export function useSampleSize() {
  const sampleSize = useSyncExternalStore(subscribe, readSampleSize, readSampleSizeOnServer);

  function setSampleSize(value: number) {
    try {
      localStorage.setItem(SAMPLE_SIZE_KEY, String(value));
    } catch {
      // The preference still applies for this visit when storage is unavailable.
    }
    window.dispatchEvent(new Event(SAMPLE_SIZE_CHANGE_EVENT));
  }

  return { sampleSize, setSampleSize };
}
