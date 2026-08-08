import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Capabilities } from "../api/client";

export function NewAnalysis() {
  const navigate = useNavigate();
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("parallel");
  const [workers, setWorkers] = useState(4);
  const [format, setFormat] = useState("application");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.capabilities().then(setCaps).catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a .log or .txt file");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const dataset = await api.uploadDataset(file);
      const job = await api.createJob({
        dataset_id: dataset.id,
        mode,
        workers: mode === "sequential" ? 1 : workers,
        format,
      });
      navigate(`/jobs/${job.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Job failed");
    } finally {
      setBusy(false);
    }
  }

  const maxWorkers = caps?.max_workers ?? 12;

  return (
    <div className="stack">
      <h1>New Analysis</h1>
      <p className="muted">Upload a log, pick workers, run via LocalProcessBackend. Polling starts on the result page.</p>
      <form className="card form" onSubmit={onSubmit}>
        <label>
          Log file
          <br />
          <input type="file" accept=".log,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label>
          Format
          <br />
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            {(caps?.parsers ?? ["application"]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mode
          <br />
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="sequential">sequential</option>
            <option value="parallel">parallel</option>
          </select>
        </label>
        <label>
          Workers
          <br />
          <select
            value={workers}
            disabled={mode === "sequential"}
            onChange={(e) => setWorkers(Number(e.target.value))}
          >
            {Array.from({ length: maxWorkers }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="submit" disabled={busy}>
          {busy ? "Starting…" : "Run analysis"}
        </button>
      </form>
    </div>
  );
}
