import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  children,
  className = "",
  style,
  ...props
}) => {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "12px",
        padding: "var(--space-lg)",
        backdropFilter: "blur(12px)",
        ...style,
      }}
      className={className}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--space-md)",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "var(--space-sm)",
          }}
        >
          <div>
            {title && (
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "info" | "success" | "warning" | "error" | "neutral";
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  children,
  style,
  ...props
}) => {
  const variantStyles = {
    info: { bg: "var(--accent-cyan-subtle)", color: "var(--accent-cyan)", border: "var(--accent-cyan)" },
    success: { bg: "var(--accent-emerald-subtle)", color: "var(--accent-emerald)", border: "var(--accent-emerald)" },
    warning: { bg: "var(--accent-amber-subtle)", color: "var(--accent-amber)", border: "var(--accent-amber)" },
    error: { bg: "var(--accent-rose-subtle)", color: "var(--accent-rose)", border: "var(--accent-rose)" },
    neutral: { bg: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "var(--border-medium)" },
  }[variant];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 500,
        backgroundColor: variantStyles.bg,
        color: variantStyles.color,
        border: `1px solid ${variantStyles.border}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  style,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: disabled || isLoading ? "not-allowed" : "pointer",
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: "all var(--transition-fast)",
    border: "none",
  };

  const variantStyles = {
    primary: {
      backgroundColor: "var(--accent-cyan)",
      color: "var(--text-inverse)",
    },
    secondary: {
      backgroundColor: "var(--bg-tertiary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-medium)",
    },
    danger: {
      backgroundColor: "var(--accent-rose)",
      color: "white",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--text-secondary)",
    },
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      style={{ ...baseStyles, ...variantStyles, ...style }}
      {...props}
    >
      {isLoading ? <span>Loading...</span> : children}
    </button>
  );
};

export interface StatBoxProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: React.ReactNode;
}

export const StatBox: React.FC<StatBoxProps> = ({ label, value, subtext, badge }) => {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "10px",
        padding: "var(--space-md)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
        {badge}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          {subtext}
        </div>
      )}
    </div>
  );
};
