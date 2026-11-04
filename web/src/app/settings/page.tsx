"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { setThemePreference, useThemePreference, type ThemePreference } from "@/lib/theme";
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

function ThemeThumbnail({ sidebarColor, surfaceColor, lineColor }: { sidebarColor: string; surfaceColor: string; lineColor: string }) {
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-full overflow-hidden rounded-button" aria-hidden>
      <rect width="120" height="72" fill={surfaceColor} />
      <rect width="32" height="72" fill={sidebarColor} />
      <rect x="8" y="10" width="16" height="4" rx="2" fill={lineColor} opacity="0.8" />
      <rect x="8" y="22" width="16" height="3" rx="1.5" fill={lineColor} opacity="0.5" />
      <rect x="8" y="30" width="16" height="3" rx="1.5" fill={lineColor} opacity="0.5" />
      <rect x="44" y="12" width="64" height="12" rx="3" fill={lineColor} opacity="0.3" />
      <rect x="44" y="30" width="30" height="30" rx="3" fill={lineColor} opacity="0.2" />
      <rect x="78" y="30" width="30" height="30" rx="3" fill={lineColor} opacity="0.2" />
    </svg>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; sidebarColor: string; surfaceColor: string; lineColor: string }[] = [
  { value: "system", label: "System", sidebarColor: "#0D0F14", surfaceColor: "#A5ADBC", lineColor: "#0D0F14" },
  { value: "light", label: "Light", sidebarColor: "#0D0F14", surfaceColor: "#F4F6FA", lineColor: "#0D0F14" },
  { value: "dark", label: "Dark", sidebarColor: "#0D0F14", surfaceColor: "#13161C", lineColor: "#F0F2F5" },
];

function ThemeOptionCard({
  label,
  active,
  onSelect,
  thumbnail,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  thumbnail: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={clsx(
        "relative flex w-[140px] flex-col gap-3 rounded-card border-2 p-3 text-left transition-colors",
        active ? "border-accent" : "border-border hover:border-text-muted",
      )}
    >
      {active && (
        <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
          <Check aria-hidden className="size-3" />
        </span>
      )}
      {thumbnail}
      <p className="text-sm font-medium text-text-primary">{label}</p>
    </button>
  );
}

function AppearanceSection() {
  const preference = useThemePreference();
  return (
    <SettingsSection title="Appearance" description="Follow your system theme, or choose light or dark. Your choice is saved on this device.">
      <div className="flex flex-wrap gap-4">
        {THEME_OPTIONS.map((option) => (
          <ThemeOptionCard
            key={option.value}
            label={option.label}
            active={preference === option.value}
            onSelect={() => setThemePreference(option.value)}
            thumbnail={
              <ThemeThumbnail sidebarColor={option.sidebarColor} surfaceColor={option.surfaceColor} lineColor={option.lineColor} />
            }
          />
        ))}
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
          <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-success" aria-hidden />
          Online since last check at {new Date(state.data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </SettingsSection>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Theme, data preferences, and API connectivity." />
      <AppearanceSection />
      <PreferencesSection />
      <ApiStatusSection />
    </div>
  );
}
