import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline";
};

export function Button({ variant = "outline", className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "solid"
          ? "bg-accent px-4 py-2 text-on-accent hover:opacity-90"
          : "border border-accent px-2.5 py-1 text-xs text-accent hover:bg-accent-tint",
        className,
      )}
      {...props}
    />
  );
}
