import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { ResultSelector } from "../components/ResultSelector";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, SourceLabel, StatusBadge } from "../components/ui";
import { useSelectedResult } from "../hooks/useSelectedResult";
import { showcaseRun } from "../data/measuredShowcase";

function downloadText(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const {
    completedJobs,
    selectedJobId,
    setSelectedJobId,
    result,
    selectedJob,
    loading,
    error,
    reload,
  } = useSelectedResult();

  const report = useMemo(() => {
    if (!result || !selectedJob) {
      return {
        title: "Measured showcase report",
        lines: [
          "Parallel Log Intelligence Platform — Showcase Report",
          `Dataset: ${showcaseRun.dataset}`,
          `Backend: ${showcaseRun.backend}`,
          `Workers: ${showcaseRun.workers}`,
          `Elapsed: ${showcaseRun.parallelSeconds}s`,
          `Speedup: ${showcaseRun.speedup}×`,
          `Records: ${showcaseRun.records.toLocaleString()}`,
          "Source: docs/PERFORMANCE.md",
          "",
          "Note: This is the measured showcase profile, not a live job export.",
        ],
      };
    }

    const findings = result.security.findings ?? [];
    return {
      title: `Job #${selectedJob.job_id} report`,
      lines: [
        "Parallel Log Intelligence Platform — Job Report",
        `Job ID: ${selectedJob.job_id}`,
        `Dataset ID: ${selectedJob.dataset_id ?? "n/a"}`,
        `Backend: ${selectedJob.execution_backend ?? "process"}`,
        `Workers: ${selectedJob.worker_count ?? 1}`,
        `Status: ${selectedJob.status}`,
        `Total records: ${String(result.summary.records_processed ?? "n/a")}`,
        `Valid records: ${String(result.summary.valid_records ?? "n/a")}`,
        `5xx count: ${String(result.errors.count_5xx ?? 0)}`,
        `Security findings: ${findings.length}`,
        "",
        "Security findings:",
        ...(findings.length
          ? findings.map(
              (finding) =>
                `- [${finding.severity ?? "n/a"}] ${finding.type ?? "finding"} (${finding.event_count ?? 0}) — ${finding.summary ?? ""}`,
            )
          : ["- None crossed Stage 1 thresholds."]),
        "",
        "AI report:",
        result.ai_report ?? "(not generated)",
      ],
    };
  }, [result, selectedJob]);

  const textBody = report.lines.join("\n");
  const jsonBody = JSON.stringify(
    result
      ? { job: selectedJob, result }
      : { showcase: showcaseRun, source: "docs/PERFORMANCE.md" },
    null,
    2,
  );

  return (
    <div className="page-stack motion-root">
      <PageHeader
        eyebrow="Export workspace"
        title="Reports"
        description="Generate text and JSON exports from a completed job, or fall back to the measured showcase profile."
        actions={
          <Link className="button secondary" to="/">
            <Icon name="report" size={16} /> Back to overview
          </Link>
        }
      />

      <ResultSelector
        jobs={completedJobs}
        value={selectedJobId}
        onChange={setSelectedJobId}
        live={Boolean(result)}
      />

      {loading ? <LoadingState label="Loading report source…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

      <div className="dashboard-grid equal">
        <Panel
          title={report.title}
          description="Preview the export before downloading."
          action={result ? <StatusBadge status="completed">Live job</StatusBadge> : <SourceLabel />}
        >
          <pre className="report-preview">{textBody}</pre>
          <div className="button-row">
            <button className="button" type="button" onClick={() => downloadText("analysis-report.txt", textBody)}>
              <Icon name="download" size={16} /> Download TXT
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => downloadText("analysis-report.json", jsonBody, "application/json")}
            >
              Download JSON
            </button>
          </div>
        </Panel>

        <Panel title="Report contents" description="What is included and what is intentionally omitted.">
          <div className="contract-list">
            <div>
              <Icon name="check" />
              <div>
                <strong>Included</strong>
                <span>Job metadata, severity totals, errors, findings, and AI report text.</span>
              </div>
            </div>
            <div>
              <Icon name="alert" />
              <div>
                <strong>Omitted</strong>
                <span>Raw log lines, fabricated CUDA metrics, and invented speedups.</span>
              </div>
            </div>
            <div>
              <Icon name="benchmark" />
              <div>
                <strong>Performance claims</strong>
                <span>Showcase exports cite docs/PERFORMANCE.md explicitly.</span>
              </div>
            </div>
          </div>
          {!completedJobs.length ? (
            <EmptyState
              icon="report"
              title="No completed jobs yet"
              description="Run an analysis to export live evidence. Showcase export remains available."
              to="/analyze"
              action="Run analysis"
            />
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
