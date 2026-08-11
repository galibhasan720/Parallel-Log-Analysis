import { CSSProperties, useEffect, useMemo, useState } from "react";
import { showcaseRun } from "../data/measuredShowcase";
import { Icon } from "./Icon";
import { usePrefersMotion } from "./motion";
import { InfoTip, ProgressBar, SegmentedControl, SourceLabel } from "./ui";

type Backend = "sequential" | "process" | "dynamic" | "openmp" | "mpi";

const backendOptions = [
  { value: "sequential", label: "Sequential" },
  { value: "process", label: "ProcessPool" },
  { value: "dynamic", label: "Dynamic" },
  { value: "openmp", label: "OpenMP" },
  { value: "mpi", label: "MPI" },
];

const backendText: Record<Backend, { unit: string; scheduler: string; summary: string }> = {
  sequential: {
    unit: "Core",
    scheduler: "Single execution stream",
    summary: "One process reads and analyzes the complete file.",
  },
  process: {
    unit: "Worker",
    scheduler: "8 equal byte chunks",
    summary: "Independent Python processes consume newline-aligned byte ranges.",
  },
  dynamic: {
    unit: "Worker",
    scheduler: "Queue · 64 small chunks",
    summary: "Workers pull the next available chunk as soon as they finish.",
  },
  openmp: {
    unit: "Thread",
    scheduler: "OpenMP static schedule",
    summary: "Native C threads share memory inside one process.",
  },
  mpi: {
    unit: "Rank",
    scheduler: "MPI scatter / gather",
    summary: "Independent ranks gather partial results at Rank 0.",
  },
};

function FlowArrow({ delayClass = "" }: { delayClass?: string }) {
  return (
    <span className="flow-arrow">
      <Icon name="arrow" size={17} />
      <i className={`flow-packet ${delayClass}`} aria-hidden="true" />
      <i className={`flow-packet delay-1 ${delayClass}`} aria-hidden="true" />
    </span>
  );
}

export function ProcessingPipeline({ compact = false }: { compact?: boolean }) {
  const motion = usePrefersMotion();
  const [backend, setBackend] = useState<Backend>("process");
  const [loopKey, setLoopKey] = useState(0);
  const details = backendText[backend];
  const units = backend === "sequential" ? 1 : backend === "mpi" ? 4 : 8;
  const rows = useMemo(
    () =>
      Array.from({ length: units }, (_, index) => {
        const share = backend === "dynamic" ? 88 + ((index * 7) % 12) : 96 + (index % 4);
        return {
          id: index + 1,
          progress: share,
          records: backend === "sequential" ? "~902K" : `~${112 + (index % 3)}K`,
          time: backend === "openmp" ? `${0.42 + index * 0.01}s` : `${3.44 + index * 0.04}s`,
        };
      }),
    [backend, units],
  );

  useEffect(() => {
    if (!motion) return;
    const id = window.setInterval(() => setLoopKey((value) => value + 1), 6500);
    return () => window.clearInterval(id);
  }, [motion, backend]);

  return (
    <div className={`pipeline ${compact ? "compact" : ""} ${motion ? "live-loop" : ""}`} key={`${backend}-${loopKey}`}>
      <div className="pipeline-toolbar">
        <SegmentedControl
          ariaLabel="Select execution topology"
          value={backend}
          options={backendOptions}
          onChange={(value) => setBackend(value as Backend)}
        />
        <SourceLabel />
      </div>

      <div className="pipeline-story">
        <div className="pipeline-node input">
          <span className="node-icon">
            <Icon name="file" />
          </span>
          <div>
            <span>Input dataset</span>
            <strong>{showcaseRun.dataset}</strong>
            <small>100 MB · 901,610 records</small>
          </div>
        </div>
        <FlowArrow />
        <div className="pipeline-node">
          <span className="node-icon">
            <Icon name="explorer" />
          </span>
          <div>
            <span>Parse & validate</span>
            <strong>Application Log</strong>
            <small>newline integrity verified</small>
          </div>
        </div>
        <FlowArrow delayClass="delay-2" />
        <div className="pipeline-node">
          <span className="node-icon">
            <Icon name="cpu" />
          </span>
          <div>
            <span>Schedule</span>
            <strong>{details.scheduler}</strong>
            <small>{details.summary}</small>
          </div>
        </div>
      </div>

      <div className="worker-section">
        <div className="worker-heading">
          <div>
            <span className="eyebrow">Parallel execution topology</span>
            <h3>
              {units} {details.unit}
              {units > 1 ? "s" : ""}
              <InfoTip text="This is an educational topology visualization. The current API exposes job-level status, not live per-worker telemetry." />
            </h3>
          </div>
          <span className="illustration-label">Topology illustration</span>
        </div>
        <div className={`worker-grid ${units === 1 ? "single" : ""}`}>
          {rows.map((row, index) => (
            <article
              className="worker-lane"
              key={`${backend}-${row.id}`}
              style={
                {
                  animationDelay: `${index * 60}ms`,
                  ["--final-width" as string]: `${row.progress}%`,
                } as CSSProperties
              }
            >
              <div className="worker-meta">
                <span className="worker-index">
                  {details.unit} {String(row.id).padStart(2, "0")}
                </span>
                <span className="worker-state">
                  <span /> {motion ? "Processing" : "Complete"}
                </span>
              </div>
              <ProgressBar value={row.progress} />
              <div className="worker-stats">
                <span>{row.records} records</span>
                <span>{backend === "mpi" ? "gathered" : row.time}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="reduction-flow">
        <div className="partial-stack" aria-label="Partial results">
          {Array.from({ length: Math.min(units, 6) }, (_, index) => (
            <span key={index} style={{ animationDelay: `${index * 80}ms` }} />
          ))}
        </div>
        <Icon name="arrow" />
        <div className="reduction-node">
          <Icon name="database" />
          <div>
            <strong>Deterministic reduction</strong>
            <span>sequential ≡ parallel aggregates</span>
          </div>
        </div>
        <Icon name="arrow" />
        <div className="result-node">
          <Icon name="check" />
          <div>
            <strong>Structured evidence</strong>
            <span>analytics · findings · AI context</span>
          </div>
        </div>
      </div>
    </div>
  );
}
