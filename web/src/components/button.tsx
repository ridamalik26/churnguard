import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "secondary", className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" ? "bg-accent text-accent-ink hover:opacity-90" : "border border-line text-ink hover:bg-line",
        className,
      )}
      {...props}
    />
  );
}
