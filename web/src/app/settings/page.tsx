"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { setDarkTheme, useIsDarkTheme } from "@/lib/theme";
import type { HealthStatus } from "@/lib/api";
import { SAMPLE_SIZE_OPTIONS, useSampleSize } from "@/lib/preferences";
import { useApiData } from "@/lib/use-api-data";

function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
      <div>
        <h2 className="font-semibold tracking-tight text-text-primary">{title}</h2>
        <p className="mt-1 text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ThemeOptionCard({
  label,
  active,
  onSelect,
  thumbBg,
  thumbLine,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  thumbBg: string;
  thumbLine: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={clsx(
        "relative flex w-40 flex-col gap-3 rounded-card border-2 p-3 text-left transition-colors",
        active ? "border-accent" : "border-border hover:border-text-muted",
      )}
    >
      {active && (
        <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
          <Check aria-hidden className="size-3" />
        </span>
      )}
      <div className="flex h-20 flex-col gap-1.5 rounded-button p-2" style={{ backgroundColor: thumbBg }}>
        <div className="h-2 w-10 rounded-full" style={{ backgroundColor: thumbLine }} />
        <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: thumbLine, opacity: 0.6 }} />
        <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: thumbLine, opacity: 0.6 }} />
      </div>
      <p className="text-sm font-medium text-text-primary">{label}</p>
    </button>
  );
}

function AppearanceSection() {
  const isDark = useIsDarkTheme();
  return (
    <SettingsSection title="Appearance" description="Switch between light and dark themes. Your choice is saved on this device.">
      <div className="flex gap-4">
        <ThemeOptionCard label="Light" active={!isDark} onSelect={() => setDarkTheme(false)} thumbBg="#F4F6FA" thumbLine="#0D0F14" />
        <ThemeOptionCard label="Dark" active={isDark} onSelect={() => setDarkTheme(true)} thumbBg="#0D0F14" thumbLine="#F0F2F5" />
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
      <div className="flex gap-2">
        {SAMPLE_SIZE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSampleSize(option)}
            aria-pressed={sampleSize === option}
            className={clsx(
              "rounded-full border px-4 py-1.5 tabular-nums transition-colors",
              sampleSize === option
                ? "border-accent bg-accent text-on-accent"
                : "border-border text-text-secondary hover:text-text-primary",
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
          <span className="relative flex size-2.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
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
