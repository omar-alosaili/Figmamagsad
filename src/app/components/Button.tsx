import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

// The app's real button language, codified once. Replaces the dozens of
// hand-rolled "bg-primary rounded-2xl py-3.5" CTAs that had drifted apart.
// (The generated shadcn ui/button.tsx used rounded-md/h-9 sizing that
// never matched this app, so it went unused.)

type Variant = "primary" | "secondary" | "outline" | "ghost" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.99]",
  secondary: "bg-muted text-foreground hover:bg-secondary",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  accent: "bg-accent text-white hover:opacity-90 active:scale-[0.99]",
  danger: "bg-danger-soft text-danger hover:opacity-80",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-xl",
  md: "px-4 py-2.5 text-sm rounded-2xl",
  lg: "px-5 py-3.5 text-sm rounded-2xl",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "lg", fullWidth, loading, disabled, className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "inline-flex items-center justify-center gap-2 font-semibold transition-all",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        className,
      ].filter(Boolean).join(" ")}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      )}
      {children}
    </button>
  );
});
