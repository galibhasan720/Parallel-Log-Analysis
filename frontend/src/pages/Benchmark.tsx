import { FormEvent, useEffect, useMemo, useState } from "react";
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

export function BenchmarkPage() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState<number | "">("");
  const [workersText, setWorkersText] = useState("1,2,4");
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
      setError("Enter worker counts such as 1,2,4");
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
    <div className="stack">
      <h1>Benchmark</h1>
      <p className="muted">
        Times LocalProcessBackend. Stop the UI and Ollama during official HPC matrix runs.
        Max workers on this machine: {caps?.max_workers ?? 12}.
      </p>
      <form className="card form" onSubmit={onSubmit}>
        <label>
          Dataset
          <br />
          <select value={datasetId} onChange={(e) => setDatasetId(e.target.value ? Number(e.target.value) : "")}>
            {datasets.length === 0 ? <option value="">No datasets</option> : null}
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                #{d.id} {d.filename}
              </option>
            ))}
          </select>
        </label>
        <label>
          Workers (comma-separated)
          <br />
          <input value={workersText} onChange={(e) => setWorkersText(e.target.value)} />
        </label>
        <label>
          Timed runs per worker count
          <br />
          <input type="number" min={1} max={5} value={runs} onChange={(e) => setRuns(Number(e.target.value))} />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="submit" disabled={busy || datasets.length === 0}>
          {busy ? "Starting…" : "Run benchmark"}
        </button>
      </form>
      {jobId ? (
        <p>
          Job {jobId}{" "}
          <span className={`badge ${status === "completed" ? "ok" : status === "failed" ? "bad" : ""}`}>{status}</span>
        </p>
      ) : null}
      {chartData.length ? (
        <div className="card">
          <h2>Workers vs time / speedup / efficiency</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3542" />
                <XAxis dataKey="workers" stroke="#9aa8b6" />
                <YAxis yAxisId="left" stroke="#9aa8b6" />
                <YAxis yAxisId="right" orientation="right" stroke="#9aa8b6" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="elapsed" name="seconds" stroke="#3d8bfd" />
                <Line yAxisId="right" type="monotone" dataKey="speedup" name="speedup" stroke="#3dd68c" />
                <Line yAxisId="right" type="monotone" dataKey="efficiency" name="efficiency" stroke="#e6b84d" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Workers</th>
                <th>Seconds</th>
                <th>Speedup</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.workers}>
                  <td>{row.workers}</td>
                  <td>{row.elapsed.toFixed(3)}</td>
                  <td>{row.speedup.toFixed(2)}</td>
                  <td>{row.efficiency.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
