import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { ProcessingPipeline } from "../components/ProcessingPipeline";
import { PageHeader, Panel, ProgressBar, SourceLabel, StatusBadge } from "../components/ui";
import { useAppData } from "../context/AppDataContext";
import { showcaseRun } from "../data/measuredShowcase";

export function ParallelProcessingPage() {
  const { capabilities, jobs } = useAppData();
  const status = capabilities?.backend_status ?? {};
  const active = jobs.filter((job) => !["completed", "failed"].includes(job.status));

  return (
    <div className="page-stack motion-root">
      <PageHeader
        eyebrow="Execution topology"
        title="Parallel Processing"
        description="See how a log dataset is decomposed, scheduled across ProcessPool, OpenMP, or MPI, then reduced into deterministic evidence."
        actions={
          <Link className="button" to="/analyze">
            <Icon name="play" size={16} /> Configure a run
          </Link>
        }
      />

      <div className="support-strip">
        <span>
          <Icon name="cpu" size={16} />
          Active jobs <strong>{active.length}</strong>
        </span>
        <span>
          Default showcase <strong>{showcaseRun.backend}</strong>
        </span>
        <span>
          Chunks <strong>{showcaseRun.chunks}</strong>
        </span>
        <span>
          Average chunk <strong>{showcaseRun.averageChunk}</strong>
        </span>
        <span>
          Measured speedup <strong>{showcaseRun.speedup}×</strong>
        </span>
      </div>

      <div className="metric-grid">
        <article className="metric-card tone-primary">
          <div className="metric-label">Decomposition</div>
          <div className="metric-value">{showcaseRun.chunks}</div>
          <div className="metric-footer"><span>Newline-aligned chunks</span></div>
        </article>
        <article className="metric-card tone-cyan">
          <div className="metric-label">Parallel units</div>
          <div className="metric-value">{showcaseRun.workers}</div>
          <div className="metric-footer"><span>ProcessPool workers</span></div>
        </article>
        <article className="metric-card tone-success">
          <div className="metric-label">Sequential → parallel</div>
          <div className="metric-value">{showcaseRun.sequentialSeconds}s → {showcaseRun.parallelSeconds}s</div>
          <div className="metric-footer"><span>100 MB measured</span></div>
        </article>
        <article className="metric-card tone-warning">
          <div className="metric-label">Efficiency</div>
          <div className="metric-value">{Math.round(showcaseRun.efficiency * 100)}%</div>
          <div className="metric-footer"><span>Honest sublinear scaling</span></div>
        </article>
      </div>

      <Panel
        title="Execution model comparison"
        description="Same aggregate contract. Different parallel programming models."
      >
        <div className="backend-card-grid">
          {[
            ["process", "ProcessPool", "Independent Python OS processes"],
            ["dynamic", "Dynamic", "Queue-fed small chunks"],
            ["openmp", "OpenMP", "Native shared-memory C threads"],
            ["mpi", "MPI", "Single-node ranks with gather"],
          ].map(([key, title, detail]) => (
            <article className="backend-choice static" key={key}>
              <span className="backend-choice-icon">
                <Icon name="cpu" />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
              <StatusBadge status={status[key]?.available === false ? "unavailable" : "ready"}>
                {status[key]?.available === false ? "Unavailable" : "Ready"}
              </StatusBadge>
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        title="Parallel Processing Engine"
        description="Educational topology visualization. Live jobs expose job-level status, not per-worker telemetry."
        action={<SourceLabel />}
      >
        <ProcessingPipeline />
      </Panel>

      <div className="dashboard-grid equal">
        <Panel title="Workload distribution" description="Measured showcase for synth_100mb.log with 8 static chunks.">
          <div className="workload-board">
            <div className="workload-meta">
              <div>
                <span>Dataset</span>
                <strong>{showcaseRun.bytesLabel}</strong>
              </div>
              <div>
                <span>Chunks</span>
                <strong>{showcaseRun.chunks}</strong>
              </div>
              <div>
                <span>Workers</span>
                <strong>{showcaseRun.workers}</strong>
              </div>
              <div>
                <span>Boundary</span>
                <strong>Newline-aligned</strong>
              </div>
            </div>
            <div className="chunk-bar animated" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => (
                <span key={index} style={{ animationDelay: `${index * 70}ms` }}>
                  C{index + 1}
                </span>
              ))}
            </div>
            <div className="worker-load-list">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index}>
                  <span>Worker {String(index + 1).padStart(2, "0")}</span>
                  <ProgressBar value={94 + (index % 5)} label={`${(12.5 + (index % 3) * 0.1).toFixed(1)} MB`} />
                </div>
              ))}
            </div>
            <p className="inline-note">
              Load imbalance remains low under equal byte decomposition. Dynamic mode is available when chunk sizes vary.
            </p>
          </div>
        </Panel>

        <Panel title="Correctness contract" description="Why parallel results remain trustworthy.">
          <div className="contract-list">
            <div>
              <Icon name="check" />
              <div>
                <strong>Sequential ≡ parallel</strong>
                <span>Pytest parity checks totals, histograms, and findings.</span>
              </div>
            </div>
            <div>
              <Icon name="database" />
              <div>
                <strong>Associative partials</strong>
                <span>Workers return mergeable counts, never full record dumps.</span>
              </div>
            </div>
            <div>
              <Icon name="explorer" />
              <div>
                <strong>Newline alignment</strong>
                <span>Chunk boundaries never split a log record mid-line.</span>
              </div>
            </div>
            <div>
              <Icon name="shield" />
              <div>
                <strong>No CUDA claim</strong>
                <span>Iris Xe cannot run CUDA; CPU backends are the supported path.</span>
              </div>
            </div>
          </div>
          <Link className="button secondary compact" to="/performance">
            Open measured performance →
          </Link>
        </Panel>
      </div>
    </div>
  );
}
