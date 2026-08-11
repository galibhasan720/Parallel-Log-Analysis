import { Fragment, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  errorPatternProfile,
  evidencePreview,
  securityPreview,
  serviceProfile,
  severityProfile,
  statusProfile,
} from "../data/measuredShowcase";
import { chartTooltipStyle, series, severityColors } from "../data/vizPalette";
import type { Finding } from "../api/client";
import { Icon } from "./Icon";
import { SegmentedControl, SourceLabel, StatusBadge } from "./ui";

type AnalysisTab = "severity" | "services" | "status" | "errors" | "endpoints" | "ips";

type CountRow = { key: string; count: number };

function normalizeCounts(value: unknown): CountRow[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .map(([key, count]) => ({ key, count: Number(count) || 0 }))
    .sort((a, b) => b.count - a.count);
}

export function AnalysisOverview({
  summary,
  errors,
  evidence,
  live = false,
}: {
  summary?: Record<string, unknown>;
  errors?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  live?: boolean;
}) {
  const [tab, setTab] = useState<AnalysisTab>("severity");
  const severity = useMemo(() => {
    const liveCounts = normalizeCounts(summary?.level_counts);
    if (!liveCounts.length) return severityProfile.map((row) => ({ name: row.name, value: row.value, color: row.color }));
    const total = liveCounts.reduce((sum, row) => sum + row.count, 0) || 1;
    return liveCounts.map((row) => ({
      name: row.key,
      value: Math.round((row.count / total) * 1000) / 10,
      count: row.count,
      color: severityColors[row.key] ?? series[row.key.length % series.length],
    }));
  }, [summary]);

  const rows = useMemo(() => {
    if (tab === "services") {
      const liveRows = normalizeCounts(summary?.service_counts);
      return liveRows.length
        ? liveRows.map((row) => ({ label: row.key, value: row.count }))
        : serviceProfile.map((row) => ({ label: row.name, value: row.value }));
    }
    if (tab === "status") {
      const liveRows = normalizeCounts(summary?.status_counts);
      return liveRows.length
        ? liveRows.map((row) => ({ label: row.key, value: row.count }))
        : statusProfile.map((row) => ({ label: row.name, value: row.value }));
    }
    if (tab === "errors") {
      const liveRows = normalizeCounts(errors?.error_patterns);
      return liveRows.length
        ? liveRows.map((row) => ({ label: row.key.replaceAll("_", " "), value: row.count }))
        : errorPatternProfile.map((row) => ({ label: row.label, value: row.value }));
    }
    if (tab === "endpoints") {
      const top = summary?.top_endpoints as CountRow[] | undefined;
      const liveRows = top?.length ? top : normalizeCounts(evidence?.path_counts);
      return (liveRows?.length ? liveRows : evidencePreview.endpoints).map((row) => ({
        label: row.key,
        value: row.count,
      }));
    }
    if (tab === "ips") {
      const top = summary?.top_ips as CountRow[] | undefined;
      const liveRows = top?.length ? top : normalizeCounts(evidence?.ip_counts);
      return (liveRows?.length ? liveRows : evidencePreview.ips).map((row) => ({
        label: row.key,
        value: row.count,
      }));
    }
    return [];
  }, [tab, summary, errors, evidence]);

  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="analysis-overview">
      <div className="module-toolbar">
        <SegmentedControl
          ariaLabel="Analysis dimension"
          value={tab}
          onChange={(value) => setTab(value as AnalysisTab)}
          options={[
            { value: "severity", label: "Severity" },
            { value: "services", label: "Services" },
            { value: "status", label: "HTTP status" },
            { value: "errors", label: "Errors" },
            { value: "endpoints", label: "Endpoints" },
            { value: "ips", label: "Source IPs" },
          ]}
        />
        <SourceLabel live={live} />
      </div>

      {tab === "severity" ? (
        <div className="severity-layout" key={`severity-${live ? "live" : "showcase"}`}>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severity}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="91%"
                  paddingAngle={2}
                  animationDuration={1100}
                  animationBegin={80}
                >
                  {severity.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => [`${value}%`, "Share"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>100%</strong>
              <span>{live ? "processed" : "generator profile"}</span>
            </div>
          </div>
          <div className="legend-list">
            {severity.map((row) => (
              <div key={row.name}>
                <span className="legend-color" style={{ background: row.color }} />
                <span>{row.name}</span>
                <strong>{row.value}%</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bar-list" key={tab}>
          {rows.slice(0, 8).map((row, index) => (
            <div className="bar-row reveal" key={row.label} style={{ ["--d" as string]: `${index * 60}ms` }}>
              <div className="bar-row-meta">
                <span>{row.label}</span>
                <strong>{row.value.toLocaleString()}</strong>
              </div>
              <div className="bar-track">
                <span
                  style={{
                    width: `${Math.max(4, (row.value / max) * 100)}%`,
                    background: `linear-gradient(90deg, ${series[index % series.length]}, ${series[(index + 1) % series.length]})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type SecurityRow = {
  id: string;
  type: string;
  severity: string;
  confidence: number;
  source: string;
  service: string;
  events: number;
  evidence: string;
  recommendation: string;
};

function findingsToRows(findings?: Finding[]): SecurityRow[] {
  if (!findings?.length) return securityPreview;
  return findings.map((finding, index) => ({
    id: finding.finding_id ?? `${finding.type}-${index}`,
    type: finding.type?.replaceAll("_", " ") ?? "Evidence finding",
    severity: finding.severity ?? "MEDIUM",
    confidence: finding.confidence ?? 0,
    source: finding.source_ips?.[0] ?? "Multiple / unavailable",
    service: "From aggregate evidence",
    events: finding.event_count ?? 0,
    evidence: finding.summary ?? "See supporting aggregate evidence.",
    recommendation: "Correlate this signal with application and access-control context.",
  }));
}

export function SecurityFindingsTable({
  findings,
  live = false,
  limit,
}: {
  findings?: Finding[];
  live?: boolean;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = findingsToRows(findings);
  const visible = typeof limit === "number" ? rows.slice(0, limit) : rows;
  return (
    <div className="security-table-wrap">
      <div className="table-caption">
        <span>
          <Icon name="shield" size={16} />
          Evidence-based heuristics — not confirmed attacks.
        </span>
        <SourceLabel live={live} />
      </div>
      <div className="table-scroll">
        <table className="data-table security-table">
          <thead>
            <tr>
              <th>Finding</th>
              <th>Source</th>
              <th>Severity</th>
              <th>Confidence</th>
              <th>Events</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <Fragment key={row.id}>
                <tr>
                  <td>
                    <strong>{row.type}</strong>
                    <small>{row.service}</small>
                  </td>
                  <td className="mono">{row.source}</td>
                  <td>
                    <StatusBadge status={row.severity}>{row.severity}</StatusBadge>
                  </td>
                  <td>{Math.round(row.confidence * 100)}%</td>
                  <td>{row.events.toLocaleString()}</td>
                  <td>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`Expand ${row.type}`}
                      aria-expanded={expanded === row.id}
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    >
                      <Icon name="chevron" size={16} />
                    </button>
                  </td>
                </tr>
                {expanded === row.id ? (
                  <tr className="expanded-row">
                    <td colSpan={6}>
                      <div>
                        <span>
                          <strong>Evidence</strong>
                          {row.evidence}
                        </span>
                        <span>
                          <strong>Suggested investigation</strong>
                          {row.recommendation}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AiInsightsPanel({
  report,
  findings,
  live = false,
}: {
  report?: string | null;
  findings?: Finding[];
  live?: boolean;
}) {
  const cards = useMemo(() => {
    const rows = findingsToRows(findings);
    if (live && report) {
      return [
        {
          id: "ollama-report",
          title: "Local Ollama summary",
          confidence: "high",
          summary: report,
          evidence: "Generated from aggregates and findings only — never raw log lines.",
          next: "Cross-check the cited findings in Security Analysis before acting.",
        },
        ...rows.slice(0, 3).map((row) => ({
          id: row.id,
          title: row.type,
          confidence: row.confidence >= 0.8 ? "high" : row.confidence >= 0.65 ? "medium" : "low",
          summary: row.evidence,
          evidence: `${row.events.toLocaleString()} events · source ${row.source}`,
          next: row.recommendation,
        })),
      ];
    }
    return [
      {
        id: "showcase-summary",
        title: "Measured showcase summary",
        confidence: "high",
        summary:
          "The 100 MB ProcessPool run completed with 1.95× speedup. Authentication and timeout signals should be reviewed with service and source-IP aggregates.",
        evidence: "docs/PERFORMANCE.md · generator profile heuristics",
        next: "Run a live job or open Security Analysis for expandable evidence.",
      },
      ...securityPreview.map((row) => ({
        id: row.id,
        title: row.type,
        confidence: row.confidence >= 0.8 ? "high" : "medium",
        summary: row.evidence,
        evidence: `${row.events.toLocaleString()} events · source ${row.source}`,
        next: row.recommendation,
      })),
    ];
  }, [findings, live, report]);

  return (
    <div className="insight-grid">
      <div className="table-caption">
        <span>
          <Icon name="ai" size={16} />
          Deterministic evidence cards{live ? " plus optional Ollama prose" : ""}.
        </span>
        <SourceLabel live={live} />
      </div>
      {cards.map((card) => (
        <article className="insight-card" key={card.id}>
          <header>
            <strong>{card.title}</strong>
            <StatusBadge status={card.confidence}>{card.confidence}</StatusBadge>
          </header>
          <p>{card.summary}</p>
          <div className="insight-meta">
            <span>
              <strong>Evidence</strong>
              {card.evidence}
            </span>
            <span>
              <strong>Next step</strong>
              {card.next}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
