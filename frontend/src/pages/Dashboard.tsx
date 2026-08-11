import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnalysisResult, ApiError, api } from "../api/client";
import { AnalysisOverview, SecurityFindingsTable } from "../components/AnalysisVisuals";
import { Icon } from "../components/Icon";
import { PerformanceCharts } from "../components/PerformanceCharts";
import { ProcessingPipeline } from "../components/ProcessingPipeline";
import {
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  SegmentedControl,
  SourceLabel,
  StatusBadge,
} from "../components/ui";
import { CountUp, MotionRoot, Stagger } from "../components/motion";
import { useAppData } from "../context/AppDataContext";
import { hardware, showcaseJobs, uploadTruth } from "../data/measuredShowcase";

export function Dashboard() {
  const {
    capabilities,
    datasets,
    jobs,
    loading,
    error,
    selectedJobId,
    setSelectedJobId,
    preferences,
    updatePreferences,
    refresh,
  } = useAppData();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultError, setResultError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");

  const selectedJob = jobs.find((job) => job.job_id === selectedJobId);

  useEffect(() => {
    let stopped = false;
    setResult(null);
    setResultError("");
    if (!selectedJobId || selectedJob?.status !== "completed") return () => undefined;
    api
      .results(selectedJobId)
      .then((body) => {
        if (!stopped) setResult(body);
      })
      .catch((err: Error) => {
        if (!stopped) setResultError(err.message);
      });
    return () => {
      stopped = true;
    };
  }, [selectedJobId, selectedJob?.status]);

  const backendHealth = capabilities?.backend_status ?? {};
  const live = Boolean(result);
  const completedJobs = useMemo(() => jobs.filter((job) => job.status === "completed"), [jobs]);

  async function generateAi() {
    if (!result || !selectedJobId) {
      setAiNote("Select a completed live job to request a local Ollama explanation.");
      return;
    }
    setAiBusy(true);
    setAiNote("");
    try {
      const body = await api.aiSummary(selectedJobId);
      setResult((current) => (current ? { ...current, ai_report: body.ai_report ?? current.ai_report } : current));
      setAiNote("Generated locally from aggregates and findings only.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setAiNote("Ollama is unavailable. Core HPC analytics and evidence remain available.");
      } else {
        setAiNote(err instanceof Error ? err.message : "AI request failed");
      }
    } finally {
      setAiBusy(false);
    }
  }

  if (loading && !capabilities) return <LoadingState label="Preparing the HPC workspace…" />;

  return (
    <MotionRoot className="page-stack overview-page">
      <PageHeader
        eyebrow="HPC observability workspace"
        title="Parallel Log Intelligence"
        description="Analyze large-scale logs across CPU processes, OpenMP threads, or MPI ranks, then reduce the results into trustworthy operational evidence."
        actions={
          <>
            <Link className="button secondary" to="/performance">
              <Icon name="performance" size={16} /> Compare backends
            </Link>
            <Link className="button" to="/analyze">
              <Icon name="upload" size={16} /> New analysis
            </Link>
          </>
        }
      />

      {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}

      <div className="status-ribbon">
        <div className="system-status">
          <StatusBadge status="operational">System operational</StatusBadge>
          <span>{hardware.cpu}</span>
          <span>{hardware.logicalProcessors} logical processors</span>
        </div>
        <div className="readiness-list">
          {["process", "dynamic", "openmp", "mpi"].map((backend) => (
            <span key={backend}>
              <i className={backendHealth[backend]?.available === false ? "off" : ""} />
              {backend === "process" ? "ProcessPool" : backend}
            </span>
          ))}
          <span>
            <i className="optional" /> Ollama optional
          </span>
        </div>
      </div>

      <div className="support-strip">
        <span>
          <Icon name="file" size={16} />
          Accepted uploads <strong>{uploadTruth.extensions.join(", ")}</strong>
        </span>
        <span>
          Parser <strong>{uploadTruth.parser}</strong>
        </span>
        <span>
          Web limit <strong>{uploadTruth.webLimit}</strong>
        </span>
        <span>
          Largest measured CLI dataset <strong>{uploadTruth.largestCliDataset}</strong>
        </span>
      </div>

      <section className="how-strip">
        <div className="how-heading">
          <span className="eyebrow">How this works</span>
          <SegmentedControl
            ariaLabel="Explanation level"
            value={preferences.viewMode}
            onChange={(viewMode) => updatePreferences({ viewMode: viewMode as "simple" | "engineering" })}
            options={[
              { value: "simple", label: "Simple explanation" },
              { value: "engineering", label: "Engineering details" },
            ]}
          />
        </div>
        <div className="how-steps">
          {[
            ["file", "Large log file", "Choose a supported dataset"],
            ["explorer", "Safe chunks", "Align boundaries to full lines"],
            ["cpu", "Parallel workers", "Analyze chunks at the same time"],
            ["database", "Merge evidence", "Reduce partial counts deterministically"],
            ["ai", "Explain findings", "Use local AI on aggregates only"],
          ].map(([icon, title, detail], index) => (
            <div key={title}>
              <span className="how-icon">
                <Icon name={icon as Parameters<typeof Icon>[0]["name"]} />
              </span>
              <strong>{title}</strong>
              <small>{preferences.viewMode === "simple" ? detail : `${detail} · stage ${index + 1}`}</small>
              {index < 4 ? <Icon name="arrow" className="how-arrow" /> : null}
            </div>
          ))}
        </div>
        <p>
          {preferences.viewMode === "simple"
            ? "Instead of one CPU core reading everything, several workers analyze different parts and combine their counts without losing or duplicating complete lines."
            : "FileInputSource → newline-aligned byte decomposition → selected ExecutionBackend → associative PartialResult → deterministic reducer → findings and aggregate-only AI."}
        </p>
      </section>

      <Stagger className="metric-grid" step={90}>
        <MetricCard
          icon="file"
          label="Records processed"
          value={
            result ? (
              <CountUp value={Number(result.summary.records_processed ?? 0)} />
            ) : (
              <CountUp value={901610} />
            )
          }
          detail={result ? "Selected live result" : "100 MB dataset"}
          values={[44, 51, 58, 69, 82, 92, 100]}
        />
        <MetricCard
          icon="performance"
          label="Processing throughput"
          value={
            <>
              <CountUp value={231} />K lines/s
            </>
          }
          detail="1.94× sequential throughput"
          values={[119, 145, 188, 201, 231]}
          tone="cyan"
        />
        <MetricCard
          icon="benchmark"
          label="Parallel speedup"
          value={
            <>
              <CountUp value={1.95} decimals={2} suffix="×" />
            </>
          }
          detail="7.589s → 3.899s"
          values={[1, 1.34, 1.69, 1.67, 1.95, 1.75]}
          tone="success"
        />
        <MetricCard
          icon="cpu"
          label="Worker utilization"
          value={
            <>
              <CountUp value={8} /> / 12
            </>
          }
          detail="ProcessPool workers"
          values={[1, 2, 4, 6, 8, 8]}
          tone="warning"
        />
      </Stagger>

      <Panel
        title="Parallel Processing Engine"
        description="From newline-safe decomposition to deterministic evidence reduction."
        action={<Link to="/parallel">Open execution view →</Link>}
        className="hero-panel"
      >
        <ProcessingPipeline />
      </Panel>

      <div className="dashboard-grid two-one">
        <Panel
          title="Parallel Performance"
          description="Execution time and scaling behavior across measured workloads."
          action={<Link to="/performance">Full analysis →</Link>}
          className="span-two"
        >
          <PerformanceCharts compact />
        </Panel>
        <Panel title="Backend health" description="Runtime readiness reported by the API.">
          <div className="backend-health-list">
            {[
              ["process", "ProcessPool", "Python OS processes"],
              ["dynamic", "Dynamic", "Queue-fed chunks"],
              ["openmp", "OpenMP", "Native C threads"],
              ["mpi", "MPI", "Single-node ranks"],
            ].map(([key, label, description]) => {
              const status = backendHealth[key];
              return (
                <div key={key}>
                  <span className="backend-icon">
                    <Icon name="cpu" size={17} />
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <StatusBadge status={status?.available === false ? "unavailable" : "ready"}>
                    {status?.available === false ? "Unavailable" : "Ready"}
                  </StatusBadge>
                </div>
              );
            })}
            <div>
              <span className="backend-icon">
                <Icon name="performance" size={17} />
              </span>
              <span>
                <strong>CUDA</strong>
                <small>Intel Iris Xe is not a CUDA device</small>
              </span>
              <StatusBadge status="unavailable">Not supported</StatusBadge>
            </div>
          </div>
        </Panel>
      </div>

      <div className="dashboard-grid equal">
        <Panel
          title="Analysis Overview"
          description="Generator profile or selected live aggregate dimensions."
          className="span-two"
        >
          <AnalysisOverview
            summary={result?.summary}
            errors={result?.errors}
            evidence={result?.evidence}
            live={live}
          />
        </Panel>
        <Panel
          title="AI-Assisted Analysis"
          description="Local interpretation of processed evidence — never raw logs."
          className="ai-panel"
          action={<span className="model-chip">Ollama · local</span>}
        >
          <div className="ai-summary">
            <div className="ai-symbol">
              <Icon name="ai" size={24} />
            </div>
            <p>
              {result?.ai_report ??
                "The selected measured run completed successfully. Authentication and timeout signals should be reviewed alongside service and source-IP aggregates."}
            </p>
          </div>
          <div className="ai-evidence">
            <div>
              <span>Possible root cause</span>
              <strong>Repeated authentication failures and timeout-related exceptions.</strong>
            </div>
            <div>
              <span>Privacy boundary</span>
              <strong>Aggregates and findings only</strong>
            </div>
          </div>
          {aiNote ? <p className="inline-note">{aiNote}</p> : null}
          <div className="button-row">
            <Link className="button secondary compact" to="/ai-insights">
              View evidence
            </Link>
            <button className="button compact" type="button" disabled={aiBusy} onClick={() => void generateAi()}>
              {aiBusy ? "Generating…" : "Generate report"}
            </button>
          </div>
        </Panel>
      </div>

      <Panel
        title="Security Findings"
        description="Expandable heuristic evidence for investigation, not confirmed attacks."
        action={<Link to="/security">Open security workspace →</Link>}
      >
        <SecurityFindingsTable findings={result?.security.findings} live={live} limit={3} />
      </Panel>

      <div className="dashboard-grid equal">
        <Panel
          title="Recent jobs"
          description={
            jobs.length ? "Live jobs from the local database." : "Measured showcase rows while the database is empty."
          }
          className="span-two"
          action={
            <Link className="button compact secondary" to="/analyze">
              New analysis
            </Link>
          }
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dataset / Job</th>
                  <th>Backend</th>
                  <th>Workers</th>
                  <th>Time</th>
                  <th>Speedup</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length
                  ? jobs.slice(0, 6).map((job) => (
                      <tr key={job.job_id}>
                        <td>
                          <Link to={`/jobs/${job.job_id}`}>Job #{job.job_id}</Link>
                          <small>{job.created_at ? new Date(job.created_at).toLocaleString() : "Local job"}</small>
                        </td>
                        <td>{job.execution_backend ?? "process"}</td>
                        <td>{job.worker_count ?? 1}</td>
                        <td>—</td>
                        <td>—</td>
                        <td>
                          <StatusBadge status={job.status}>{job.status}</StatusBadge>
                        </td>
                      </tr>
                    ))
                  : showcaseJobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <strong>{job.dataset}</strong>
                          <small>{job.size} · measured showcase</small>
                        </td>
                        <td>{job.backend}</td>
                        <td>{job.workers}</td>
                        <td className="mono">{job.seconds.toFixed(3)}s</td>
                        <td>{job.speedup.toFixed(2)}×</td>
                        <td>
                          <StatusBadge status={job.status}>{job.status}</StatusBadge>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Workspace context" description="Choose a completed live job to replace showcase analytics.">
          <label className="field">
            <span>Selected job</span>
            <select
              value={selectedJobId ?? ""}
              onChange={(event) => setSelectedJobId(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Measured showcase</option>
              {completedJobs.map((job) => (
                <option key={job.job_id} value={job.job_id}>
                  Job #{job.job_id} · {job.execution_backend}
                </option>
              ))}
            </select>
          </label>
          <div className="context-stat-grid">
            <div>
              <span>Datasets</span>
              <strong>{datasets.length}</strong>
            </div>
            <div>
              <span>Jobs</span>
              <strong>{jobs.length}</strong>
            </div>
            <div>
              <span>View</span>
              <strong>{preferences.viewMode}</strong>
            </div>
            <div>
              <span>Data source</span>
              <strong>{live ? "Live" : "Showcase"}</strong>
            </div>
          </div>
          {resultError ? <p className="inline-note danger">{resultError}</p> : null}
          <SourceLabel live={live} />
        </Panel>
      </div>
    </MotionRoot>
  );
}
