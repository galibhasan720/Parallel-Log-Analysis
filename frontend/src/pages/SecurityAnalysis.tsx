import { Link } from "react-router-dom";
import { AnalysisOverview, SecurityFindingsTable } from "../components/AnalysisVisuals";
import { Icon } from "../components/Icon";
import { ResultSelector } from "../components/ResultSelector";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "../components/ui";
import { useSelectedResult } from "../hooks/useSelectedResult";
import { securityPreview } from "../data/measuredShowcase";

function countMap(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  return Object.values(value as Record<string, unknown>).reduce<number>(
    (sum, item) => sum + (Number(item) || 0),
    0,
  );
}

export function SecurityAnalysisPage() {
  const {
    completedJobs,
    selectedJobId,
    setSelectedJobId,
    result,
    loading,
    error,
    reload,
  } = useSelectedResult();

  const authFails = countMap(result?.evidence.auth_fail_by_ip);
  const notFound = countMap(result?.evidence.not_found_by_ip);
  const sensitive = countMap(result?.evidence.sensitive_path_counts);
  const count5xx = Number(result?.errors.count_5xx ?? 0);
  const live = Boolean(result);

  return (
    <div className="page-stack motion-root">
      <PageHeader
        eyebrow="Evidence workspace"
        title="Security Analysis"
        description="Investigate heuristic findings derived from processed aggregates. These signals guide investigation; they do not confirm attacks."
        actions={
          <Link className="button secondary" to="/ai-insights">
            <Icon name="ai" size={16} /> Open AI insights
          </Link>
        }
      />

      <div className="truth-notice">
        <Icon name="shield" />
        <div>
          <strong>Evidence-based heuristics only.</strong>
          <span>Never present these findings as definitive compromise or confirmed intrusion.</span>
        </div>
      </div>

      <ResultSelector
        jobs={completedJobs}
        value={selectedJobId}
        onChange={setSelectedJobId}
        live={live}
      />

      {loading ? <LoadingState label="Loading security evidence…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

      <div className="metric-grid">
        <article className="metric-card tone-warning">
          <div className="metric-label">Auth-fail signals</div>
          <div className="metric-value">
            {live ? authFails.toLocaleString() : securityPreview[0].events.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>{live ? "Live aggregate" : "Showcase example"}</span>
          </div>
        </article>
        <article className="metric-card tone-primary">
          <div className="metric-label">404 concentration</div>
          <div className="metric-value">
            {live ? notFound.toLocaleString() : securityPreview[2].events.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>{live ? "Live aggregate" : "Showcase example"}</span>
          </div>
        </article>
        <article className="metric-card tone-cyan">
          <div className="metric-label">Sensitive-path hits</div>
          <div className="metric-value">
            {live ? sensitive.toLocaleString() : securityPreview[1].events.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>{live ? "Live aggregate" : "Showcase example"}</span>
          </div>
        </article>
        <article className="metric-card tone-success">
          <div className="metric-label">5xx responses</div>
          <div className="metric-value">{live ? count5xx.toLocaleString() : "—"}</div>
          <div className="metric-footer">
            <span>{live ? "Live aggregate" : "Select a live job"}</span>
          </div>
        </article>
      </div>

      <Panel title="Findings" description="Expand a row for evidence and investigation guidance.">
        <SecurityFindingsTable findings={result?.security.findings} live={live} />
      </Panel>

      <Panel title="Supporting aggregate views" description="Severity, services, and error dimensions that contextualize the findings.">
        {live || !completedJobs.length ? (
          <AnalysisOverview
            summary={result?.summary}
            errors={result?.errors}
            evidence={result?.evidence}
            live={live}
          />
        ) : (
          <EmptyState
            icon="shield"
            title="Choose a completed job"
            description="Security investigation uses stored analysis results. Showcase findings remain available above."
            to="/analyze"
            action="Run analysis"
          />
        )}
      </Panel>
    </div>
  );
}
