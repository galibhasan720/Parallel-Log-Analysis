import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Capabilities, Dataset, JobStatus } from "../api/client";

export function Dashboard() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.capabilities(), api.datasets(), api.jobs()])
      .then(([c, d, j]) => {
        setCaps(c);
        setDatasets(d);
        setJobs(j);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="stack">
      <h1>Dashboard</h1>
      {error ? <div className="error">{error}</div> : null}
      <div className="grid">
        <div className="card">
          <h3>Datasets</h3>
          <p>{datasets.length}</p>
          <Link to="/analyze">Upload & analyze</Link>
        </div>
        <div className="card">
          <h3>Jobs</h3>
          <p>{jobs.length}</p>
          <Link to="/benchmark">Run benchmark</Link>
        </div>
        <div className="card">
          <h3>Backend</h3>
          <p>{caps?.execution_backend ?? "…"}</p>
          <span className="muted">
            max workers {caps?.max_workers ?? "—"} · {caps?.parser_version}
          </span>
        </div>
      </div>
      <div className="card">
        <h2>Recent jobs</h2>
        {jobs.length === 0 ? (
          <p className="muted">No jobs yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Mode</th>
                <th>Workers</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 12).map((job) => (
                <tr key={job.job_id}>
                  <td>{job.job_id}</td>
                  <td>
                    <span className={`badge ${job.status === "completed" ? "ok" : job.status === "failed" ? "bad" : ""}`}>
                      {job.status}
                    </span>
                  </td>
                  <td>{job.processing_mode}</td>
                  <td>{job.worker_count}</td>
                  <td>
                    <Link to={`/jobs/${job.job_id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
