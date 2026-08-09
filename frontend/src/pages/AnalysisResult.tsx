import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisResult, ApiError, Finding, JobStatus, api } from "../api/client";

function countRows(value: unknown): [string, number][] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, number>).sort((a, b) => Number(b[1]) - Number(a[1]));
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
  const topEndpoints = (result?.summary?.top_endpoints as { key: string; count: number }[]) ?? [];
  const topServices = (result?.summary?.top_services as { key: string; count: number }[]) ?? [];
  const patterns = countRows(result?.errors?.error_patterns);

  return (
    <div className="stack">
      <h1>Analysis result</h1>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        <p>
          Job <strong>{jobId}</strong>{" "}
          <span className={`badge ${job?.status === "completed" ? "ok" : job?.status === "failed" ? "bad" : ""}`}>
            {job?.status ?? "loading"}
          </span>
        </p>
        <p className="muted">
          {job?.processing_mode} · {job?.worker_count} workers · {job?.execution_backend}
        </p>
        {job?.error_message ? <p className="error">{job.error_message}</p> : null}
      </div>
      {result ? (
        <>
          <div className="grid">
            <div className="card">
              <h3>Records</h3>
              <p>{String(result.summary.records_processed ?? "—")}</p>
              <span className="muted">
                valid {String(result.summary.valid_records ?? "—")} · invalid{" "}
                {String(result.summary.invalid_records ?? "—")}
              </span>
            </div>
            <div className="card">
              <h3>5xx</h3>
              <p>{String(result.errors.count_5xx ?? "—")}</p>
            </div>
            <div className="card">
              <h3>Findings</h3>
              <p>{findings.length}</p>
            </div>
          </div>
          <div className="card">
            <h2>Top endpoints</h2>
            <table className="table">
              <tbody>
                {topEndpoints.map((row) => (
                  <tr key={row.key}>
                    <td>{row.key}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2>Top services</h2>
            <table className="table">
              <tbody>
                {topServices.map((row) => (
                  <tr key={row.key}>
                    <td>{row.key}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2>Error patterns</h2>
            <table className="table">
              <tbody>
                {patterns.map(([key, count]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2>Security findings</h2>
            <p className="muted">Evidence-based heuristics. Not “definitely an attack.”</p>
            {findings.length === 0 ? (
              <p className="muted">No findings crossed the Stage 1 thresholds.</p>
            ) : (
              findings.map((finding) => (
                <div key={finding.finding_id ?? finding.type} className="card" style={{ marginTop: "0.6rem" }}>
                  <strong>{finding.type}</strong>{" "}
                  <span className={`badge ${finding.severity === "HIGH" ? "bad" : "warn"}`}>
                    {finding.severity}
                  </span>
                  <p>{finding.summary}</p>
                  {finding.source_ips?.length ? (
                    <p className="muted">IPs: {finding.source_ips.slice(0, 8).join(", ")}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div className="card">
            <h2>AI report</h2>
            <p className="muted">Ollama sees aggregates and findings only — never raw logs.</p>
            <button type="button" onClick={() => void generateAi()} disabled={aiBusy}>
              {aiBusy ? "Generating…" : "Generate AI Report"}
            </button>
            {aiNote ? <p className="muted">{aiNote}</p> : null}
            {result.ai_report ? <div className="pre">{result.ai_report}</div> : null}
          </div>
        </>
      ) : (
        <p className="muted">Waiting for HPC job… queued → running → aggregating → completed.</p>
      )}
    </div>
  );
}
