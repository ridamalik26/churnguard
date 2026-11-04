"use client";

import { useSyncExternalStore } from "react";

export const THEME_STORAGE_KEY = "theme";
export const THEME_CHANGE_EVENT = "themechange";

// Runs before first paint so a saved dark theme never flashes light on load.
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}`;

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function isDarkTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function isDarkThemeOnServer() {
  return false;
}

export function useIsDarkTheme() {
  return useSyncExternalStore(subscribe, isDarkTheme, isDarkThemeOnServer);
}

export function setDarkTheme(next: boolean) {
  document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
  } catch {
    // The theme still applies for this visit when storage is unavailable.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
