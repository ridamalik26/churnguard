import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "outline-accent" | "ghost";
};

export function Button({ variant = "outline", className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-button font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "solid" && "bg-accent px-4 py-2 text-on-accent hover:bg-accent-hover",
        variant === "outline" && "border border-border px-3 py-1.5 text-text-secondary hover:border-accent hover:text-accent",
        variant === "outline-accent" && "border border-accent px-2.5 py-1 text-xs text-accent hover:bg-accent-light",
        variant === "ghost" && "px-3 py-1.5 text-text-secondary hover:text-text-primary",
        className,
      )}
      {...props}
    />
  );
}
