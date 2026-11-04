"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function readHost() {
  return window.location.host;
}

function readHostOnServer() {
  return "localhost:5025";
}

export function HostLabel() {
  const host = useSyncExternalStore(subscribe, readHost, readHostOnServer);
  return <span>{host}</span>;
}
