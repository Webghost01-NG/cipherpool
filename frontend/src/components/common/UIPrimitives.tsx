import React from "react";
import { LoaderCircle } from "lucide-react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  eyebrow,
  headerAction,
  children,
  className = "",
  ...props
}) => (
  <section className={`panel ${className}`.trim()} {...props}>
    {(title || subtitle || eyebrow || headerAction) && (
      <header className="panel__header">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {title && <h2 className="panel__title">{title}</h2>}
          {subtitle && <p className="panel__subtitle">{subtitle}</p>}
        </div>
        {headerAction && <div className="panel__action">{headerAction}</div>}
      </header>
    )}
    {children}
  </section>
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "info" | "success" | "warning" | "error" | "neutral";
}

export const Badge: React.FC<BadgeProps> = ({ variant = "neutral", children, className = "", ...props }) => (
  <span className={`badge badge--${variant} ${className}`.trim()} {...props}>
    {children}
  </span>
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  className = "",
  ...props
}) => (
  <button
    className={`button button--${variant} ${className}`.trim()}
    disabled={disabled || isLoading}
    aria-busy={isLoading}
    {...props}
  >
    {isLoading ? (
      <>
        <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
        <span className="sr-only">{children}</span>
      </>
    ) : children}
  </button>
);

export interface StatBoxProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: React.ReactNode;
  status?: "loading" | "pending" | "fresh" | "stale" | "unavailable";
}

const metricStatusLabel = {
  loading: "Loading",
  pending: "Awaiting round",
  stale: "Stale",
  unavailable: "Unavailable",
} as const;

export const StatBox: React.FC<StatBoxProps> = ({
  label,
  value,
  subtext,
  badge,
  status = "fresh",
}) => {
  const hasVerifiedValue = status === "fresh" || status === "stale";
  const hint = status === "loading"
    ? "Loading verified source…"
    : status === "pending"
      ? (subtext ?? "Awaiting the first verified protocol event")
      : status === "unavailable"
        ? (subtext ?? "Verified source unavailable")
        : status === "stale"
          ? `Last confirmed value${subtext ? ` · ${subtext}` : ""}`
          : subtext;

  return (
    <article className={`metric metric--${status}`}>
      <div className="metric__topline">
        <span>{label}</span>
        {status === "fresh" ? badge : (
          <span className={`metric__state metric__state--${status}`}>{metricStatusLabel[status]}</span>
        )}
      </div>
      <strong
        className="metric__value"
        aria-busy={status === "loading" || undefined}
      >
        {hasVerifiedValue ? value : (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">{label} {status}</span>
          </>
        )}
      </strong>
      {hint && <p className="metric__hint">{hint}</p>}
    </article>
  );
};
