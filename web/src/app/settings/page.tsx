"use client";

import clsx from "clsx";
import { useEffect, type ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { HealthStatus } from "@/lib/api";
import { SAMPLE_SIZE_OPTIONS, useSampleSize } from "@/lib/preferences";
import { useApiData } from "@/lib/use-api-data";

function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card">
      <div>
        <h2 className="font-semibold tracking-tight text-text-primary">{title}</h2>
        <p className="mt-1 text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

function AppearanceSection() {
  return (
    <SettingsSection title="Appearance" description="Switch between light and dark themes. Your choice is saved on this device.">
      <div className="max-w-xs">
        <ThemeToggle />
      </div>
    </SettingsSection>
  );
}

function PreferencesSection() {
  const { sampleSize, setSampleSize } = useSampleSize();
  return (
    <SettingsSection
      title="Application Preferences"
      description="How many customers to load on the dashboard, customer list, and retention intelligence pages."
    >
      <div className="inline-flex self-start rounded-button border border-border p-1">
        {SAMPLE_SIZE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSampleSize(option)}
            aria-pressed={sampleSize === option}
            className={clsx(
              "rounded-badge px-3 py-1.5 tabular-nums transition-colors",
              sampleSize === option ? "bg-accent text-on-accent" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}

function ApiStatusSection() {
  const { state, retry } = useApiData<HealthStatus>("/health");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const interval = setInterval(retry, 30000);
    return () => clearInterval(interval);
  }, [retry]);

  return (
    <SettingsSection title="API Status" description={apiUrl ?? "NEXT_PUBLIC_API_URL is not set."}>
      {state.status === "loading" && <p className="text-text-secondary">Checking...</p>}
      {state.status === "error" && (
        <div className="flex items-center gap-2 text-text-primary">
          <span className="size-2.5 shrink-0 rounded-full bg-danger" aria-hidden />
          Offline: {state.message}
        </div>
      )}
      {state.status === "ready" && (
        <div className="flex items-center gap-2 text-text-primary">
          <span className="size-2.5 shrink-0 rounded-full bg-success" aria-hidden />
          Online since last check at {new Date(state.data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </SettingsSection>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Settings" subtitle="Theme, data preferences, and API connectivity." />
      <AppearanceSection />
      <PreferencesSection />
      <ApiStatusSection />
    </div>
  );
}
