import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, BenchmarkOut, Capabilities, Dataset } from "../api/client";
import { Icon } from "../components/Icon";
import { PageHeader, Panel, SourceLabel, StatusBadge } from "../components/ui";
import { strong100 } from "../data/measuredShowcase";
import { chartTooltipStyle, viz } from "../data/vizPalette";

export function BenchmarkPage() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState<number | "">("");
  const [backend, setBackend] = useState("process");
  const [workersText, setWorkersText] = useState("1,2,4,8");
  const [runs, setRuns] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [bench, setBench] = useState<BenchmarkOut | null>(null);

  useEffect(() => {
    Promise.all([api.capabilities(), api.datasets()])
      .then(([c, d]) => {
        setCaps(c);
        setDatasets(d);
        if (d[0]) setDatasetId(d[0].id);
        const preferred = c.execution_backends?.[0] ?? c.execution_backend ?? "process";
        setBackend(preferred === "local_process" ? "process" : preferred);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (jobId == null) return;
    const id = jobId;
    let stop = false;
    async function tick() {
      try {
        const job = await api.job(id);
        if (stop) return;
        setStatus(job.status);
        if (job.status === "completed" || job.status === "failed") {
          const body = await api.benchmark(id);
          if (!stop) setBench(body);
          return;
        }
        window.setTimeout(tick, 800);
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : "Benchmark poll failed");
      }
    }
    void tick();
    return () => {
      stop = true;
    };
  }, [jobId]);

  const chartData = useMemo(() => {
    const byWorkers = new Map<number, { workers: number; elapsed: number; speedup: number; efficiency: number }>();
    for (const row of bench?.rows ?? []) {
      const prev = byWorkers.get(row.workers);
      const elapsed = prev ? Math.min(prev.elapsed, row.elapsed_sec) : row.elapsed_sec;
      byWorkers.set(row.workers, {
        workers: row.workers,
        elapsed,
        speedup: row.speedup ?? 0,
        efficiency: row.efficiency ?? 0,
      });
    }
    return [...byWorkers.values()].sort((a, b) => a.workers - b.workers);
  }, [bench]);

  const best = chartData.reduce<{ workers: number; elapsed: number; speedup: number } | null>((acc, row) => {
    if (!acc || row.elapsed < acc.elapsed) return row;
    return acc;
  }, null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (datasetId === "") {
      setError("Upload a dataset first (New Analysis).");
      return;
    }
    const workers = workersText
      .split(",")
      .map((w) => Number(w.trim()))
      .filter((w) => Number.isFinite(w) && w >= 1);
    if (!workers.length) {
      setError("Enter worker counts such as 1,2,4,8");
      return;
    }
    setBusy(true);
    setError("");
    setBench(null);
    try {
      const created = await api.createBenchmark({
        dataset_id: Number(datasetId),
        workers,
        runs,
        execution_backend: backend,
      });
      setJobId(created.job_id);
      setStatus(created.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Benchmark failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack motion-root">
      <PageHeader
        eyebrow="Live Stage-2 matrix"
        title="Benchmarks"
        description="Time a chosen ExecutionBackend across worker counts. Stop the UI and Ollama during official matrices."
        actions={
          <Link className="button secondary" to="/performance">
            <Icon name="performance" size={16} /> Measured archive
          </Link>
        }
      />

      <div className="truth-notice">
        <Icon name="benchmark" />
        <div>
          <strong>Select process, dynamic, OpenMP, or MPI.</strong>
          <span>
            Unavailable backends are blocked by the API. Cross-backend archive numbers remain in Performance /
            docs/PERFORMANCE.md.
          </span>
        </div>
      </div>

      <div className="dashboard-grid two-one">
        <Panel title="Configure live benchmark" description={`Max workers on this machine: ${caps?.max_workers ?? 12}.`}>
          <form className="form-grid benchmark-form" onSubmit={onSubmit}>
            <label className="field">
              <span>Dataset</span>
              <select
                value={datasetId}
                onChange={(event) => setDatasetId(event.target.value ? Number(event.target.value) : "")}
              >
                {datasets.length === 0 ? <option value="">No datasets uploaded</option> : null}
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    #{dataset.id} {dataset.filename}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Execution backend</span>
              <select value={backend} onChange={(event) => setBackend(event.target.value)}>
                {(caps?.execution_backends ?? ["process", "dynamic", "openmp", "mpi"]).map((name) => {
                  const available = caps?.backend_status?.[name]?.available !== false;
                  return (
                    <option key={name} value={name} disabled={!available}>
                      {name}
                      {!available ? " (unavailable)" : ""}
                    </option>
                  );
                })}
              </select>
              <small>{caps?.backend_status?.[backend]?.detail ?? `Max workers ${caps?.max_workers ?? 12}`}</small>
            </label>
            <label className="field">
              <span>Workers (comma-separated)</span>
              <input value={workersText} onChange={(event) => setWorkersText(event.target.value)} />
            </label>
            <label className="field">
              <span>Timed runs per worker count</span>
              <input
                type="number"
                min={1}
                max={5}
                value={runs}
                onChange={(event) => setRuns(Number(event.target.value))}
              />
            </label>
            {error ? (
              <div className="form-error" role="alert">
                <Icon name="alert" size={17} />
                {error}
              </div>
            ) : null}
            <button className="button" type="submit" disabled={busy || datasets.length === 0}>
              <Icon name="play" size={16} />
              {busy ? "Starting…" : "Run benchmark"}
            </button>
          </form>
        </Panel>

        <Panel title="Run status" description="Polling continues until the matrix job finishes.">
          {jobId ? (
            <div className="benchmark-status">
              <StatusBadge status={status || "queued"}>{status || "queued"}</StatusBadge>
              <p>
                Job <Link to={`/jobs/${jobId}`}>#{jobId}</Link>
              </p>
              {best ? (
                <div className="metric-grid compact-metrics">
                  <article className="metric-card tone-success">
                    <div className="metric-label">Best elapsed</div>
                    <div className="metric-value">{best.elapsed.toFixed(2)}s</div>
                    <div className="metric-footer">
                      <span>{best.workers} workers</span>
                    </div>
                  </article>
                  <article className="metric-card tone-primary">
                    <div className="metric-label">Best speedup</div>
                    <div className="metric-value">{best.speedup.toFixed(2)}×</div>
                    <div className="metric-footer">
                      <span>vs 1-worker baseline</span>
                    </div>
                  </article>
                </div>
              ) : (
                <p className="inline-note">Results appear when the job completes.</p>
              )}
            </div>
          ) : (
            <div className="empty-soft">
              <Icon name="benchmark" />
              <strong>No live matrix yet</strong>
              <span>Configure workers and start a run, or review the measured 100 MB archive below.</span>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Workers vs time / speedup / efficiency"
        description={chartData.length ? "Live benchmark result" : "Showing measured 100 MB archive until a live run finishes."}
        action={<SourceLabel live={Boolean(chartData.length)} />}
      >
        <div className="chart-frame tall" key={chartData.length ? `live-${jobId}` : "showcase"}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.length ? chartData : strong100.map((row) => ({
              workers: row.workers,
              elapsed: row.seconds,
              speedup: row.speedup,
              efficiency: row.efficiency,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={viz.grid} />
              <XAxis dataKey="workers" stroke={viz.axis} />
              <YAxis yAxisId="left" stroke={viz.axis} />
              <YAxis yAxisId="right" orientation="right" stroke={viz.axis} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="elapsed" name="seconds" stroke={viz.azure} strokeWidth={3} dot={{ r: 4, fill: viz.azure }} animationDuration={1200} />
              <Line yAxisId="right" type="monotone" dataKey="speedup" name="speedup" stroke={viz.mint} strokeWidth={3} dot={{ r: 4, fill: viz.mint }} animationDuration={1300} />
              <Line yAxisId="right" type="monotone" dataKey="efficiency" name="efficiency" stroke={viz.amber} strokeWidth={3} dot={{ r: 4, fill: viz.amber }} animationDuration={1400} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Workers</th>
                <th>Seconds</th>
                <th>Speedup</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {(chartData.length
                ? chartData
                : strong100.map((row) => ({
                    workers: row.workers,
                    elapsed: row.seconds,
                    speedup: row.speedup,
                    efficiency: row.efficiency,
                  }))
              ).map((row) => (
                <tr key={row.workers}>
                  <td>{row.workers}</td>
                  <td className="mono">{row.elapsed.toFixed(3)}</td>
                  <td>{row.speedup.toFixed(2)}×</td>
                  <td>{row.efficiency.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
