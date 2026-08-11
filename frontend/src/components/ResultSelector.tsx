import type { JobStatus } from "../api/client";
import { Icon } from "./Icon";
import { SourceLabel, StatusBadge } from "./ui";

export function ResultSelector({
  jobs,
  value,
  onChange,
  live,
}: {
  jobs: JobStatus[];
  value: number | null;
  onChange: (id: number | null) => void;
  live: boolean;
}) {
  return (
    <div className="result-selector">
      <span className="result-selector-icon">
        <Icon name="database" />
      </span>
      <label>
        <span>Evidence source</span>
        <select value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}>
          <option value="">Measured showcase</option>
          {jobs.map((job) => (
            <option key={job.job_id} value={job.job_id}>
              Job #{job.job_id} · {job.execution_backend ?? "process"} · {job.worker_count ?? 1} workers
            </option>
          ))}
        </select>
      </label>
      <SourceLabel live={live} />
      {value ? <StatusBadge status="completed">Completed</StatusBadge> : null}
    </div>
  );
}
