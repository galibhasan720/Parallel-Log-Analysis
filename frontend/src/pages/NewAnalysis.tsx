import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Icon } from "../components/Icon";
import { PageHeader, Panel, StatusBadge } from "../components/ui";
import { useAppData } from "../context/AppDataContext";
import { uploadTruth } from "../data/measuredShowcase";

const backendCopy: Record<string, { title: string; detail: string; unit: string }> = {
  process: {
    title: "ProcessPool",
    detail: "Equal newline-aligned byte chunks across independent Python processes.",
    unit: "workers",
  },
  dynamic: {
    title: "Dynamic ProcessPool",
    detail: "Many smaller chunks are pulled from a queue as workers become available.",
    unit: "workers",
  },
  openmp: {
    title: "OpenMP",
    detail: "Native C shared-memory threads with low launch overhead.",
    unit: "threads",
  },
  mpi: {
    title: "MPI",
    detail: "Single-node mpi4py ranks gather partial results at rank zero.",
    unit: "ranks",
  },
};

export function NewAnalysis() {
  const navigate = useNavigate();
  const { capabilities, preferences, refresh } = useAppData();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [mode, setMode] = useState("parallel");
  const [workers, setWorkers] = useState(preferences.defaultWorkers);
  const [format] = useState("application");
  const [backend, setBackend] = useState(preferences.defaultBackend);
  const [schedule, setSchedule] = useState("static");
  const [chunksPerWorker, setChunksPerWorker] = useState(8);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const maxUpload = capabilities?.max_upload_bytes ?? uploadTruth.webLimitBytes;
  const maxWorkers = capabilities?.max_workers ?? 12;
  const backends = capabilities?.execution_backends ?? ["process", "dynamic", "openmp", "mpi"];
  const backendStatus = capabilities?.backend_status ?? {};
  const effectiveWorkers = mode === "sequential" ? 1 : workers;

  useEffect(() => {
    if (!backends.includes(backend)) {
      const firstReady = backends.find((item) => backendStatus[item]?.available !== false) ?? "process";
      setBackend(firstReady);
    }
  }, [backend, backends, backendStatus]);

  const parsedPreview = useMemo(() => {
    const parts = preview.trim().split(/\s+/);
    return {
      timestamp: parts[0] ?? "—",
      severity: parts[1] ?? "—",
      service: parts[2] ?? "—",
      message: parts.slice(3, Math.max(4, parts.findIndex((part) => part.startsWith("ip=")))).join(" ") || "—",
      ip: parts.find((part) => part.startsWith("ip="))?.slice(3) ?? "—",
      method: parts.find((part) => ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(part)) ?? "—",
      path: parts.find((part) => part.startsWith("/")) ?? "—",
      status: parts.find((part) => part.startsWith("status="))?.slice(7) ?? "—",
    };
  }, [preview]);

  async function selectFile(nextFile: File | null) {
    setError("");
    if (!nextFile) {
      setFile(null);
      setPreview("");
      return;
    }
    const extension = `.${nextFile.name.split(".").pop()?.toLowerCase()}`;
    if (!uploadTruth.extensions.includes(extension)) {
      setError(`Unsupported file type. Choose ${uploadTruth.extensions.join(" or ")}.`);
      return;
    }
    if (nextFile.size > maxUpload) {
      setError(`This file exceeds the ${Math.round(maxUpload / 1024 / 1024)} MB web upload limit. Use the CLI workflow.`);
      return;
    }
    setFile(nextFile);
    try {
      const text = await nextFile.slice(0, 4096).text();
      setPreview(text.split(/\r?\n/).find((line) => line.trim()) ?? "");
    } catch {
      setPreview("");
    }
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    void selectFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  function next() {
    setError("");
    if (step === 1 && !file) {
      setError("Choose a .log or .txt file before continuing.");
      return;
    }
    if (step === 3 && backendStatus[backend]?.available === false) {
      setError(`${backendCopy[backend]?.title ?? backend} is unavailable on this runtime.`);
      return;
    }
    setStep((current) => Math.min(5, current + 1));
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const dataset = await api.uploadDataset(file);
      const job = await api.createJob({
        dataset_id: dataset.id,
        mode,
        workers: effectiveWorkers,
        format,
        execution_backend: backend,
        schedule: backend === "process" ? schedule : undefined,
        chunks_per_worker: backend === "dynamic" || schedule === "dynamic" ? chunksPerWorker : undefined,
      });
      await refresh();
      navigate(`/jobs/${job.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the analysis job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack analysis-wizard-page motion-root">
      <PageHeader
        eyebrow="Dataset ingestion"
        title="New Analysis"
        description="Validate a supported log file, choose a CPU execution model, and capture a reproducible analysis configuration."
      />

      <div className="wizard-stepper" aria-label="Analysis setup progress">
        <span
          className="wizard-progress-line"
          style={{ width: `${((step - 1) / 4) * 84}%` }}
          aria-hidden="true"
        />
        {["Select dataset", "Validate format", "Choose backend", "Configure", "Review & run"].map(
          (label, index) => {
            const number = index + 1;
            return (
              <button
                key={label}
                type="button"
                className={step === number ? "active" : step > number ? "complete" : ""}
                onClick={() => {
                  if (number < step || (number === 2 && file)) setStep(number);
                }}
              >
                <span>{step > number ? <Icon name="check" size={14} /> : number}</span>
                <strong>{label}</strong>
              </button>
            );
          },
        )}
      </div>

      <div className="wizard-layout">
        <Panel className="wizard-main">
          {step === 1 ? (
            <div className="wizard-section" key="step-1">
              <div className="section-heading">
                <span className="eyebrow">Step 1 of 5</span>
                <h2>Select a log dataset</h2>
                <p>The browser validates the extension and size before any upload begins.</p>
              </div>
              <div
                className={`upload-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <span className="upload-icon">
                  <Icon name={file ? "check" : "upload"} size={30} />
                </span>
                {file ? (
                  <>
                    <strong>{file.name}</strong>
                    <span>
                      {(file.size / 1024 / 1024).toFixed(2)} MB · ready for local preview
                    </span>
                    <button className="button secondary compact" type="button" onClick={() => void selectFile(null)}>
                      Choose another file
                    </button>
                  </>
                ) : (
                  <>
                    <strong>Drop a .log or .txt file here</strong>
                    <span>or browse from this laptop</span>
                    <label className="button compact">
                      Browse files
                      <input type="file" accept=".log,.txt" onChange={onFileInput} />
                    </label>
                  </>
                )}
              </div>
              <div className="upload-rules">
                <div>
                  <Icon name="file" />
                  <span>
                    <strong>Accepted now</strong>
                    .log and .txt
                  </span>
                </div>
                <div>
                  <Icon name="database" />
                  <span>
                    <strong>Web maximum</strong>
                    {Math.round(maxUpload / 1024 / 1024)} MB
                  </span>
                </div>
                <div>
                  <Icon name="cpu" />
                  <span>
                    <strong>Large dataset path</strong>
                    Up to 500 MB tested through CLI
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="wizard-section" key="step-2">
              <div className="section-heading">
                <span className="eyebrow">Step 2 of 5</span>
                <h2>Validate parser compatibility</h2>
                <p>Only the Application Log parser is supported by the current web workflow.</p>
              </div>
              <div className="parser-status">
                <StatusBadge status={preview ? "ready" : "warning"}>
                  {preview ? "Format preview available" : "No non-empty preview line"}
                </StatusBadge>
                <span>UTF-8 with replacement handling · complete newline boundaries</span>
              </div>
              <div className="raw-preview">
                <span>First non-empty line</span>
                <code>{preview || uploadTruth.sample}</code>
              </div>
              <div className="parsed-grid">
                {Object.entries(parsedPreview).map(([key, value]) => (
                  <div key={key}>
                    <span>{key}</span>
                    <strong className={["timestamp", "ip", "path"].includes(key) ? "mono" : ""}>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="planned-formats">
                <span>Planned, not currently accepted:</span>
                {["JSONL", "Apache", "Nginx", "streaming"].map((item) => (
                  <span className="disabled-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="wizard-section" key="step-3">
              <div className="section-heading">
                <span className="eyebrow">Step 3 of 5</span>
                <h2>Choose an execution backend</h2>
                <p>Every backend produces the same aggregate contract; the execution model changes.</p>
              </div>
              <div className="backend-card-grid">
                {backends.map((item) => {
                  const copy = backendCopy[item] ?? {
                    title: item,
                    detail: "CPU execution backend",
                    unit: "workers",
                  };
                  const available = backendStatus[item]?.available !== false;
                  return (
                    <button
                      type="button"
                      key={item}
                      className={`backend-choice ${backend === item ? "selected" : ""}`}
                      onClick={() => available && setBackend(item)}
                      disabled={!available}
                    >
                      <span className="backend-choice-icon">
                        <Icon name="cpu" />
                      </span>
                      <span>
                        <strong>{copy.title}</strong>
                        <small>{copy.detail}</small>
                      </span>
                      <StatusBadge status={available ? "ready" : "unavailable"}>
                        {available ? "Ready" : "Unavailable"}
                      </StatusBadge>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`backend-choice ${mode === "sequential" ? "selected" : ""}`}
                  onClick={() => {
                    setMode("sequential");
                    setBackend("process");
                  }}
                >
                  <span className="backend-choice-icon">
                    <Icon name="performance" />
                  </span>
                  <span>
                    <strong>Sequential baseline</strong>
                    <small>One process for correctness and speedup comparison.</small>
                  </span>
                  <StatusBadge status="ready">Ready</StatusBadge>
                </button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="wizard-section" key="step-4">
              <div className="section-heading">
                <span className="eyebrow">Step 4 of 5</span>
                <h2>Configure CPU execution</h2>
                <p>Four or eight workers are the recommended starting points for this hybrid laptop CPU.</p>
              </div>
              <div className="configuration-grid">
                <label className="field">
                  <span>Mode</span>
                  <select value={mode} onChange={(event) => setMode(event.target.value)}>
                    <option value="parallel">Parallel</option>
                    <option value="sequential">Sequential baseline</option>
                  </select>
                </label>
                <label className="field">
                  <span>{backendCopy[backend]?.unit ?? "Workers"}</span>
                  <select
                    value={effectiveWorkers}
                    disabled={mode === "sequential"}
                    onChange={(event) => setWorkers(Number(event.target.value))}
                  >
                    {Array.from({ length: maxWorkers }, (_, index) => index + 1).map((value) => (
                      <option value={value} key={value}>
                        {value}
                        {value === 4 || value === 8 ? " · recommended" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {backend === "process" ? (
                  <label className="field">
                    <span>Schedule</span>
                    <select value={schedule} onChange={(event) => setSchedule(event.target.value)}>
                      <option value="static">Static equal chunks</option>
                      <option value="dynamic">Dynamic queue</option>
                    </select>
                  </label>
                ) : null}
                {backend === "dynamic" || schedule === "dynamic" ? (
                  <label className="field">
                    <span>Chunks per worker</span>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={chunksPerWorker}
                      onChange={(event) => setChunksPerWorker(Number(event.target.value))}
                    />
                  </label>
                ) : null}
              </div>
              <div className="worker-selector">
                <div className="worker-selector-meta">
                  <span>Worker allocation</span>
                  <strong>
                    {effectiveWorkers} / {maxWorkers}
                  </strong>
                </div>
                <div className="core-map">
                  {Array.from({ length: maxWorkers }, (_, index) => (
                    <span
                      key={index}
                      className={index < effectiveWorkers ? "active" : ""}
                      title={`Logical processor ${index + 1}`}
                    >
                      {index + 1}
                    </span>
                  ))}
                </div>
              </div>
              {workers === 12 && mode === "parallel" ? (
                <div className="configuration-warning">
                  <Icon name="alert" />
                  <span>
                    <strong>12 workers may not be fastest.</strong>
                    The measured 100 MB run was best at 8 workers because process overhead and P/E cores reduce efficiency.
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="wizard-section" key="step-5">
              <div className="section-heading">
                <span className="eyebrow">Step 5 of 5</span>
                <h2>Review reproducible configuration</h2>
                <p>The server records parser, analysis, backend, worker, and configuration-hash metadata.</p>
              </div>
              <div className="review-card">
                {[
                  ["Dataset", file?.name ?? "—"],
                  ["Size", file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "—"],
                  ["Parser", format],
                  ["Backend", backendCopy[backend]?.title ?? backend],
                  ["Mode", mode],
                  [backendCopy[backend]?.unit ?? "Workers", String(effectiveWorkers)],
                  ["Schedule", backend === "process" ? schedule : "Backend-managed"],
                  ["Checksum", "Computed by server during upload"],
                  ["Configuration hash", "Computed when the job is created"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong className={label.includes("hash") || label === "Checksum" ? "mono" : ""}>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="privacy-boundary">
                <Icon name="shield" />
                <span>
                  <strong>Local processing boundary</strong>
                  The uploaded file is stored locally for the job. Optional AI receives aggregates and findings only.
                </span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="form-error" role="alert">
              <Icon name="alert" size={17} />
              {error}
            </div>
          ) : null}

          <div className="wizard-actions">
            <button
              className="button secondary"
              type="button"
              disabled={step === 1 || busy}
              onClick={() => setStep((current) => Math.max(1, current - 1))}
            >
              Back
            </button>
            {step < 5 ? (
              <button className="button" type="button" onClick={next}>
                Continue <Icon name="arrow" size={16} />
              </button>
            ) : (
              <button className="button" type="button" disabled={busy} onClick={() => void submit()}>
                {busy ? <span className="spinner small" /> : <Icon name="play" size={16} />}
                {busy ? "Uploading & starting…" : "Run analysis"}
              </button>
            )}
          </div>
        </Panel>

        <aside className="wizard-summary">
          <Panel title="Current configuration" description="Changes update as you progress.">
            <div className="summary-list">
              <div>
                <span>Dataset</span>
                <strong>{file?.name ?? "Not selected"}</strong>
              </div>
              <div>
                <span>Format</span>
                <strong>Application Log</strong>
              </div>
              <div>
                <span>Backend</span>
                <strong>{backendCopy[backend]?.title ?? backend}</strong>
              </div>
              <div>
                <span>Workers</span>
                <strong>{effectiveWorkers}</strong>
              </div>
              <div>
                <span>Schedule</span>
                <strong>{backend === "process" ? schedule : "Backend-managed"}</strong>
              </div>
            </div>
          </Panel>
          <Panel title="Device guidance">
            <div className="device-guidance">
              <span>
                <Icon name="cpu" />
                <strong>i5-1235U · 12 logical</strong>
              </span>
              <p>Use 4 workers for quick tests and 8 for the measured 100 MB showcase.</p>
              <p>Stop Ollama and unnecessary apps during official benchmark runs.</p>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
