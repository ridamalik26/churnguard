"use client";

import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_PREFERENCE_KEY = "theme-preference";
export const THEME_CHANGE_EVENT = "themechange";

// Runs before first paint so a saved or system dark theme never flashes light on load.
export const THEME_INIT_SCRIPT = `try{var p=localStorage.getItem("${THEME_PREFERENCE_KEY}")||"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.setAttribute("data-theme","dark")}catch(e){}`;

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_PREFERENCE_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : "system";
  } catch {
    return "system";
  }
}

function readPreferenceOnServer(): ThemePreference {
  return "system";
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function computeIsDark(preference: ThemePreference) {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return systemPrefersDark();
}

function applyTheme(preference: ThemePreference) {
  document.documentElement.setAttribute("data-theme", computeIsDark(preference) ? "dark" : "light");
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  function onSystemChange() {
    if (readPreference() === "system") applyTheme("system");
    onChange();
  }
  media.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    media.removeEventListener("change", onSystemChange);
  };
}

function isDarkTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function isDarkThemeOnServer() {
  return false;
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, readPreference, readPreferenceOnServer);
}

export function useIsDarkTheme() {
  return useSyncExternalStore(subscribe, isDarkTheme, isDarkThemeOnServer);
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_PREFERENCE_KEY, preference);
  } catch {
    // The theme still applies for this visit when storage is unavailable.
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function setDarkTheme(next: boolean) {
  setThemePreference(next ? "dark" : "light");
}
