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
}

export const StatBox: React.FC<StatBoxProps> = ({ label, value, subtext, badge }) => (
  <article className="metric">
    <div className="metric__topline">
      <span>{label}</span>
      {badge}
    </div>
    <strong className="metric__value">{value}</strong>
    {subtext && <p className="metric__hint">{subtext}</p>}
  </article>
);
