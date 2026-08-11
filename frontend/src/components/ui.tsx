import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "./Icon";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  className = "",
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {title || action ? (
        <div className="panel-heading">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div className="panel-action">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatusBadge({
  status,
  children,
}: {
  status: string;
  children?: ReactNode;
}) {
  const normalized = status.toLowerCase();
  const tone =
    normalized.includes("complete") ||
    normalized.includes("ready") ||
    normalized.includes("operational") ||
    normalized === "ok"
      ? "success"
      : normalized.includes("fail") ||
          normalized.includes("critical") ||
          normalized.includes("unavailable")
        ? "danger"
        : normalized.includes("warn") ||
            normalized.includes("medium") ||
            normalized.includes("queue")
          ? "warning"
          : normalized.includes("run") || normalized.includes("active")
            ? "processing"
            : "neutral";
  return (
    <span className={`status-badge ${tone}`}>
      <span className="status-dot" />
      {children ?? status}
    </span>
  );
}

function Sparkline({ values, color = "#7184ff" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 28 - ((value - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  detail,
  values,
  tone = "primary",
  measured = true,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  detail: string;
  values: number[];
  tone?: "primary" | "cyan" | "success" | "warning";
  measured?: boolean;
}) {
  const colors = {
    primary: "#4F8CFF",
    cyan: "#20E3C2",
    success: "#3DDC97",
    warning: "#FFB020",
  };
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-top">
        <span className="metric-icon">
          <Icon name={icon} size={19} />
        </span>
        {measured ? <span className="source-chip">Measured</span> : null}
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-footer">
        <span>{detail}</span>
        <Sparkline values={values} color={colors[tone]} />
      </div>
    </article>
  );
}

export function SegmentedControl({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "active" : ""}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function LoadingState({ label = "Loading platform data…" }: { label?: string }) {
  return (
    <div className="state-card" role="status">
      <div className="spinner" />
      <strong>{label}</strong>
      <span>Aggregates and backend capabilities are being requested.</span>
    </div>
  );
}

export function EmptyState({
  icon = "database",
  title,
  description,
  to,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  description: string;
  to?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="state-card">
      <span className="state-icon">
        <Icon name={icon} size={24} />
      </span>
      <strong>{title}</strong>
      <span>{description}</span>
      {to && action ? (
        <Link className="button compact" to={to}>
          {action}
        </Link>
      ) : null}
      {!to && action && onAction ? (
        <button className="button compact" type="button" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-card error-state" role="alert">
      <span className="state-icon">
        <Icon name="alert" size={24} />
      </span>
      <strong>Unable to load this view</strong>
      <span>{message}</span>
      {onRetry ? (
        <button className="button compact secondary" type="button" onClick={onRetry}>
          <Icon name="refresh" size={15} /> Retry
        </button>
      ) : null}
    </div>
  );
}

export function SourceLabel({ live = false }: { live?: boolean }) {
  return <span className={`source-chip ${live ? "live" : ""}`}>{live ? "Live job" : "Measured showcase"}</span>;
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip" tabIndex={0} aria-label={text}>
      ?
      <span role="tooltip">{text}</span>
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  sweeping = false,
}: {
  value: number;
  label?: string;
  sweeping?: boolean;
}) {
  return (
    <div
      className={`progress-wrap ${sweeping ? "sweeping" : ""}`}
      aria-label={label ?? `${value}% complete`}
    >
      <div className="progress-track">
        <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      {label ? <span className="progress-label">{label}</span> : null}
    </div>
  );
}
