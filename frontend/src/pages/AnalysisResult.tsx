import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnalysisResult, ApiError, Finding, JobStatus, api } from "../api/client";
import { AnalysisOverview, SecurityFindingsTable } from "../components/AnalysisVisuals";
import { Icon } from "../components/Icon";
import { ProcessingPipeline } from "../components/ProcessingPipeline";
import { CountUp, MotionRoot } from "../components/motion";
import {
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  ProgressBar,
  StatusBadge,
} from "../components/ui";

const stages = [
  { key: "queued", label: "Queued", detail: "Job accepted by API" },
  { key: "running", label: "Running", detail: "Workers analyzing chunks" },
  { key: "aggregating", label: "Reducing", detail: "Merging partial results" },
  { key: "completed", label: "Completed", detail: "Evidence persisted" },
];

function stageIndex(status?: string | null) {
  if (!status) return 0;
  if (status === "failed") return -1;
  const index = stages.findIndex((stage) => stage.key === status);
  if (index >= 0) return index;
  if (status === "completed") return stages.length - 1;
  return 1;
}

export function AnalysisResultPage() {
  const { id } = useParams();
  const jobId = Number(id);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");

  useEffect(() => {
    if (!Number.isFinite(jobId)) return;
    let stop = false;
    async function tick() {
      try {
        const status = await api.job(jobId);
        if (stop) return;
        setJob(status);
        if (status.status === "completed") {
          const body = await api.results(jobId);
          if (!stop) setResult(body);
          return;
        }
        if (status.status === "failed") return;
        window.setTimeout(tick, 800);
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : "Failed to load job");
      }
    }
    void tick();
    return () => {
      stop = true;
    };
  }, [jobId]);

  async function generateAi() {
    setAiBusy(true);
    setAiNote("");
    try {
      const body = await api.aiSummary(jobId);
      setResult((prev) => (prev ? { ...prev, ai_report: body.ai_report ?? prev.ai_report } : prev));
      setAiNote("Generated from aggregates and findings only.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        const detail =
          typeof (err.body as { detail?: string })?.detail === "string"
            ? (err.body as { detail: string }).detail
            : err.message;
        setAiNote(`Ollama is unavailable. ${detail}`);
      } else {
        setAiNote(err instanceof Error ? err.message : "AI request failed");
      }
    } finally {
      setAiBusy(false);
    }
  }

  const findings = (result?.security?.findings ?? []) as Finding[];
  const activeStage = stageIndex(job?.status);
  const progress = useMemo(() => {
    if (job?.status === "completed") return 100;
    if (job?.status === "failed") return 100;
    if (activeStage < 0) return 0;
    return Math.min(95, Math.round(((activeStage + 1) / stages.length) * 100));
  }, [activeStage, job?.status]);

  if (!Number.isFinite(jobId)) {
    return <ErrorState message="Invalid job id in the URL." />;
  }

  const inFlight = Boolean(job && !["completed", "failed"].includes(job.status));

  return (
    <MotionRoot className="page-stack result-page">
      <PageHeader
        eyebrow="Live job evidence"
        title={`Analysis result #${jobId}`}
        description="Track decomposition → parallel execution → reduction, then inspect the stored aggregates and findings."
        actions={
          <>
            <Link className="button secondary" to="/parallel">
              <Icon name="cpu" size={16} /> Topology
            </Link>
            <Link className="button" to="/analyze">
              <Icon name="upload" size={16} /> New analysis
            </Link>
          </>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      <div className="result-hero">
        <div className="result-hero-main">
          <div className="result-hero-top">
            <StatusBadge status={job?.status ?? "queued"}>{job?.status ?? "loading"}</StatusBadge>
            <span className="mono">job/{jobId}</span>
          </div>
          <h2>
            {job?.execution_backend ?? "process"} · {job?.worker_count ?? "—"} workers ·{" "}
            {job?.processing_mode ?? "parallel"}
          </h2>
          <p>
            Parser {job?.parser_version ?? "—"} · Analysis {job?.analysis_version ?? "—"} · Config{" "}
            <span className="mono">{job?.configuration_hash?.slice(0, 12) ?? "pending"}</span>
          </p>
          <ProgressBar
            value={progress}
            sweeping={inFlight}
            label={job?.status === "completed" ? "Evidence ready" : "In flight"}
          />
          {job?.error_message ? <p className="form-error">{job.error_message}</p> : null}
        </div>
        <div className="result-hero-metrics">
          <div>
            <span>Records</span>
            <strong>
              {result ? <CountUp value={Number(result.summary.records_processed ?? 0)} /> : "—"}
            </strong>
          </div>
          <div>
            <span>5xx</span>
            <strong>{result ? <CountUp value={Number(result.errors.count_5xx ?? 0)} /> : "—"}</strong>
          </div>
          <div>
            <span>Findings</span>
            <strong>{result ? <CountUp value={findings.length} /> : "—"}</strong>
          </div>
          <div>
            <span>Backend</span>
            <strong>{result?.execution_backend ?? job?.execution_backend ?? "—"}</strong>
          </div>
        </div>
      </div>

      <Panel title="Job timeline" description="API exposes job-level status. Worker lanes below are an educational topology.">
        <ol className="job-timeline">
          {stages.map((stage, index) => {
            const done = activeStage > index || job?.status === "completed";
            const current = activeStage === index && job?.status !== "completed";
            const failed = job?.status === "failed" && index === Math.max(activeStage, 1);
            return (
              <li key={stage.key} className={failed ? "failed" : done ? "done" : current ? "current" : ""}>
                <span className="timeline-dot" />
                <strong>{stage.label}</strong>
                <small>{stage.detail}</small>
              </li>
            );
          })}
        </ol>
        {job?.status === "failed" ? (
          <p className="inline-note">Job failed before a complete reduction was stored.</p>
        ) : null}
      </Panel>

      {!result && !error ? (
        <div className="dashboard-grid equal">
          <Panel title="Waiting for HPC job" description="Polling queued → running → aggregating → completed.">
            <LoadingState label="Workers are still processing…" />
            <ProcessingPipeline compact />
          </Panel>
          <Panel title="What happens next" description="Once reduction finishes, this page unlocks evidence views.">
            <div className="contract-list">
              <div>
                <Icon name="check" />
                <div>
                  <strong>Deterministic merge</strong>
                  <span>Partials combine without double-counting complete lines.</span>
                </div>
              </div>
              <div>
                <Icon name="shield" />
                <div>
                  <strong>Heuristic findings</strong>
                  <span>Security signals appear only after aggregates exist.</span>
                </div>
              </div>
              <div>
                <Icon name="ai" />
                <div>
                  <strong>Optional Ollama</strong>
                  <span>AI can explain aggregates after completion — never raw logs.</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="dashboard-grid equal">
            <Panel title="Analysis overview" description="Severity, services, status codes, errors, endpoints, and IPs.">
              <AnalysisOverview
                summary={result.summary}
                errors={result.errors}
                evidence={result.evidence}
                live
              />
            </Panel>
            <Panel
              title="AI-assisted analysis"
              description="Local interpretation of processed evidence."
              action={<span className="model-chip">Ollama · local</span>}
            >
              <div className="ai-summary">
                <div className="ai-symbol">
                  <Icon name="ai" size={24} />
                </div>
                <p>
                  {result.ai_report ??
                    "Generate a local report grounded in aggregates and findings. Raw log lines are never sent."}
                </p>
              </div>
              {aiNote ? <p className="inline-note">{aiNote}</p> : null}
              <div className="button-row">
                <Link className="button secondary compact" to="/ai-insights">
                  Open AI Insights
                </Link>
                <button className="button compact" type="button" disabled={aiBusy} onClick={() => void generateAi()}>
                  {aiBusy ? "Generating…" : "Generate report"}
                </button>
              </div>
            </Panel>
          </div>

          <Panel
            title="Security findings"
            description="Evidence-based heuristics for investigation — not confirmed attacks."
            action={<Link to="/security">Open security workspace →</Link>}
          >
            <SecurityFindingsTable findings={findings} live />
          </Panel>

          <div className="dashboard-grid equal">
            <Panel title="Execution provenance" description="Versions and hashes that make the run reproducible.">
              <div className="provenance-grid">
                <div>
                  <span>Execution backend</span>
                  <strong>{result.execution_backend}</strong>
                </div>
                <div>
                  <span>Parser version</span>
                  <strong>{result.parser_version}</strong>
                </div>
                <div>
                  <span>Analysis version</span>
                  <strong>{result.analysis_version}</strong>
                </div>
                <div>
                  <span>Configuration hash</span>
                  <strong className="mono">{result.configuration_hash}</strong>
                </div>
              </div>
            </Panel>
            <Panel title="Exports & next steps" description="Carry this evidence into other workspaces.">
              <div className="quick-actions">
                <Link to="/reports">
                  <Icon name="report" />
                  <span>
                    <strong>Export report</strong>
                    <small>TXT / JSON from this job</small>
                  </span>
                </Link>
                <Link to="/explorer">
                  <Icon name="explorer" />
                  <span>
                    <strong>Explore aggregates</strong>
                    <small>Search dimensions, not raw lines</small>
                  </span>
                </Link>
                <Link to="/benchmark">
                  <Icon name="benchmark" />
                  <span>
                    <strong>Benchmark dataset</strong>
                    <small>Measure scaling on the same file</small>
                  </span>
                </Link>
              </div>
            </Panel>
          </div>
        </>
      ) : null}
    </MotionRoot>
  );
}
