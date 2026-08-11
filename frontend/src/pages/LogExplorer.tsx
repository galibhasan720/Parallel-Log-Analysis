import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnalysisOverview } from "../components/AnalysisVisuals";
import { Icon } from "../components/Icon";
import { ResultSelector } from "../components/ResultSelector";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from "../components/ui";
import { useAppData } from "../context/AppDataContext";
import { uploadTruth } from "../data/measuredShowcase";
import { useSelectedResult } from "../hooks/useSelectedResult";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function LogExplorerPage() {
  const { datasets } = useAppData();
  const {
    completedJobs,
    selectedJobId,
    setSelectedJobId,
    result,
    loading,
    error,
    reload,
  } = useSelectedResult();
  const [query, setQuery] = useState("");

  const evidenceRows = useMemo(() => {
    const groups = [
      ["Path", result?.evidence.path_counts],
      ["Source IP", result?.evidence.ip_counts],
      ["Auth failure IP", result?.evidence.auth_fail_by_ip],
      ["404 source", result?.evidence.not_found_by_ip],
      ["Sensitive path", result?.evidence.sensitive_path_counts],
    ] as const;
    const rows: { dimension: string; key: string; count: number }[] = [];
    for (const [dimension, value] of groups) {
      if (!value || typeof value !== "object") continue;
      for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
        rows.push({ dimension, key, count: Number(count) || 0 });
      }
    }
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => !needle || row.key.toLowerCase().includes(needle) || row.dimension.toLowerCase().includes(needle))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);
  }, [result, query]);

  return (
    <div className="page-stack motion-root">
      <PageHeader
        eyebrow="Aggregate evidence mode"
        title="Log Explorer"
        description="Explore parsed dimensions and evidence without loading raw multi-hundred-megabyte files into the browser."
        actions={
          <Link className="button" to="/analyze">
            <Icon name="upload" size={16} /> Upload dataset
          </Link>
        }
      />

      <div className="truth-notice">
        <Icon name="shield" />
        <div>
          <strong>Raw record search is not exposed by the current API.</strong>
          <span>
            This workspace explores dataset metadata and returned aggregates: services, paths, status codes,
            source IPs, errors, and findings.
          </span>
        </div>
      </div>

      <ResultSelector
        jobs={completedJobs}
        value={selectedJobId}
        onChange={setSelectedJobId}
        live={Boolean(result)}
      />

      <div className="explorer-grid">
        <Panel title="Dataset inventory" description={`${datasets.length} local dataset${datasets.length === 1 ? "" : "s"}.`}>
          {datasets.length ? (
            <div className="dataset-list">
              {datasets.map((dataset) => (
                <article key={dataset.id}>
                  <span className="dataset-icon">
                    <Icon name="file" />
                  </span>
                  <div>
                    <strong>{dataset.filename}</strong>
                    <span>
                      {formatBytes(dataset.size_bytes)} · {dataset.format}
                    </span>
                    <small className="mono">{dataset.checksum.slice(0, 16)}…</small>
                  </div>
                  <StatusBadge status="ready">Stored</StatusBadge>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="file"
              title="No uploaded datasets"
              description="Upload a .log or .txt file to create live evidence."
              to="/analyze"
              action="New analysis"
            />
          )}
        </Panel>

        <Panel title="Parser contract" description="Current canonical Application Log format.">
          <div className="schema-preview">
            <code>{uploadTruth.sample}</code>
            <div>
              {uploadTruth.fields.map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
          </div>
          <div className="schema-facts">
            <span>
              <strong>{uploadTruth.extensions.join(" · ")}</strong>
              accepted files
            </span>
            <span>
              <strong>{uploadTruth.webLimit}</strong>
              web upload
            </span>
            <span>
              <strong>UTF-8</strong>
              replacement handling
            </span>
          </div>
        </Panel>
      </div>

      {loading ? <LoadingState label="Loading selected aggregate evidence…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

      <Panel title="Analysis dimensions" description="Switch between aggregate views without rescanning the source file.">
        <AnalysisOverview
          summary={result?.summary}
          errors={result?.errors}
          evidence={result?.evidence}
          live={Boolean(result)}
        />
      </Panel>

      <Panel
        title="Evidence index"
        description="Search keys in the selected live result. Showcase charts remain visible when no job is selected."
        action={
          <div className="compact-search">
            <Icon name="search" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter IPs, paths…" />
          </div>
        }
      >
        {!result ? (
          <EmptyState
            icon="explorer"
            title="Select a completed live job"
            description="Evidence-key filtering requires a stored analysis result. The visual summary above is the measured showcase."
          />
        ) : evidenceRows.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Evidence key</th>
                  <th>Count</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {evidenceRows.map((row) => (
                  <tr key={`${row.dimension}-${row.key}`}>
                    <td>{row.dimension}</td>
                    <td className="mono">{row.key}</td>
                    <td>{row.count.toLocaleString()}</td>
                    <td>
                      <StatusBadge status="ready">Aggregate</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="search"
            title="No evidence keys match"
            description="Change the search term or choose another completed job."
          />
        )}
      </Panel>
    </div>
  );
}
