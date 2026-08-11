import { Icon } from "../components/Icon";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from "../components/ui";
import { useAppData } from "../context/AppDataContext";
import { hardware, uploadTruth } from "../data/measuredShowcase";

export function SystemHealthPage() {
  const { capabilities, loading, error, refresh } = useAppData();
  const status = capabilities?.backend_status ?? {};

  return (
    <div className="page-stack motion-root">
      <PageHeader
        eyebrow="Runtime readiness"
        title="System Health"
        description="Inspect API availability, backend readiness, OpenMP library presence, and MPI launcher state."
        actions={
          <button className="button secondary" type="button" onClick={() => void refresh()}>
            <Icon name="refresh" size={16} /> Refresh
          </button>
        }
      />

      {loading && !capabilities ? <LoadingState label="Checking system health…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}

      <div className="metric-grid">
        <article className="metric-card tone-success">
          <div className="metric-label">API</div>
          <div className="metric-value">{capabilities ? "ok" : "—"}</div>
          <div className="metric-footer">
            <span>Capabilities endpoint</span>
          </div>
        </article>
        <article className="metric-card tone-primary">
          <div className="metric-label">Logical processors</div>
          <div className="metric-value">{hardware.logicalProcessors}</div>
          <div className="metric-footer">
            <span>{hardware.cpu}</span>
          </div>
        </article>
        <article className="metric-card tone-cyan">
          <div className="metric-label">Max workers</div>
          <div className="metric-value">{capabilities?.max_workers ?? "—"}</div>
          <div className="metric-footer">
            <span>Reported by API</span>
          </div>
        </article>
        <article className="metric-card tone-warning">
          <div className="metric-label">CUDA</div>
          <div className="metric-value">n/a</div>
          <div className="metric-footer">
            <span>{hardware.gpu} — CPU backends only</span>
          </div>
        </article>
      </div>

      <Panel title="Backend readiness" description="Availability comes from the live capabilities endpoint.">
        {!capabilities && !loading ? (
          <EmptyState
            icon="system"
            title="Capabilities unavailable"
            description="The API did not return backend capabilities."
            action="Retry"
            onAction={() => void refresh()}
          />
        ) : (
          <div className="backend-card-grid">
            {Object.entries(status).map(([key, value]) => (
              <article className="backend-choice static" key={key}>
                <span className="backend-choice-icon">
                  <Icon name="cpu" />
                </span>
                <span>
                  <strong>{key}</strong>
                  <small>{value?.detail || "No detail"}</small>
                </span>
                <StatusBadge status={value?.available ? "ready" : "unavailable"}>
                  {value?.available ? "Ready" : "Unavailable"}
                </StatusBadge>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <div className="dashboard-grid equal">
        <Panel title="Host notes" description="Hardware honesty for faculty demos.">
          <div className="contract-list">
            <div>
              <Icon name="cpu" />
              <div>
                <strong>{hardware.cpu}</strong>
                <span>{hardware.architecture}. Expect sublinear strong scaling.</span>
              </div>
            </div>
            <div>
              <Icon name="database" />
              <div>
                <strong>{hardware.memory}</strong>
                <span>Web upload ceiling {uploadTruth.webLimit}.</span>
              </div>
            </div>
            <div>
              <Icon name="alert" />
              <div>
                <strong>No CUDA path</strong>
                <span>Do not present GPU acceleration on this machine.</span>
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="Capabilities payload" description="Raw response for debugging.">
          <pre className="report-preview">{JSON.stringify(capabilities, null, 2)}</pre>
        </Panel>
      </div>
    </div>
  );
}
