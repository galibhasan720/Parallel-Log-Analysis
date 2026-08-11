export type ScalingRow = {
  workers: number;
  seconds: number;
  speedup: number;
  efficiency: number;
  throughputK?: number;
};

export type BackendRow = {
  backend: "Sequential" | "ProcessPool" | "Dynamic" | "OpenMP" | "MPI";
  workers: number;
  seconds: number;
  speedup: number;
  efficiency: number;
  note: string;
};

export const hardware = {
  cpu: "Intel Core i5-1235U",
  logicalProcessors: 12,
  architecture: "2 Performance + 8 Efficiency cores · Hyper-Threading",
  memory: "12 GB DDR4",
  gpu: "Intel Iris Xe",
  cuda: false,
};

export const uploadTruth = {
  extensions: [".log", ".txt"],
  parser: "Application Log",
  webLimitBytes: 120 * 1024 * 1024,
  webLimit: "120 MB",
  largestCliDataset: "500 MB",
  sample:
    "2026-08-01T00:00:00.018Z INFO auth-service cache hit ip=203.0.113.10 PUT /api/login status=404 latency_ms=3687",
  fields: [
    "Timestamp",
    "Severity",
    "Service",
    "Message",
    "IP address",
    "HTTP method",
    "HTTP path",
    "Status code",
    "Response time",
  ],
};

export const strong100: ScalingRow[] = [
  { workers: 1, seconds: 7.589, speedup: 1, efficiency: 1, throughputK: 119 },
  { workers: 2, seconds: 5.663, speedup: 1.34, efficiency: 0.67 },
  { workers: 4, seconds: 4.497, speedup: 1.69, efficiency: 0.42 },
  { workers: 6, seconds: 4.535, speedup: 1.67, efficiency: 0.28 },
  { workers: 8, seconds: 3.899, speedup: 1.95, efficiency: 0.24, throughputK: 231 },
  { workers: 12, seconds: 4.327, speedup: 1.75, efficiency: 0.15 },
];

export const strong500: ScalingRow[] = [
  { workers: 1, seconds: 43.732, speedup: 1, efficiency: 1, throughputK: 103 },
  { workers: 2, seconds: 33.735, speedup: 1.3, efficiency: 0.65 },
  { workers: 4, seconds: 24.414, speedup: 1.79, efficiency: 0.45 },
  { workers: 6, seconds: 20.455, speedup: 2.14, efficiency: 0.36 },
  { workers: 8, seconds: 17.947, speedup: 2.44, efficiency: 0.3 },
  { workers: 12, seconds: 17.287, speedup: 2.53, efficiency: 0.21, throughputK: 261 },
];

export const backendComparison: BackendRow[] = [
  {
    backend: "Sequential",
    workers: 1,
    seconds: 0.876,
    speedup: 1,
    efficiency: 1,
    note: "Process baseline for the 10 MB comparison",
  },
  {
    backend: "ProcessPool",
    workers: 4,
    seconds: 0.665,
    speedup: 1.32,
    efficiency: 0.33,
    note: "Static byte chunks",
  },
  {
    backend: "Dynamic",
    workers: 4,
    seconds: 0.921,
    speedup: 1.17,
    efficiency: 0.29,
    note: "Many queue-fed chunks",
  },
  {
    backend: "OpenMP",
    workers: 8,
    seconds: 0.516,
    speedup: 2.3,
    efficiency: 0.29,
    note: "Native C shared-memory threads",
  },
  {
    backend: "MPI",
    workers: 4,
    seconds: 1.445,
    speedup: 1.63,
    efficiency: 0.41,
    note: "Single-node ranks; launch overhead included",
  },
];

export const weakScaling = [
  { workers: 1, dataset: "50 MB", seconds: 4.552, efficiency: 1 },
  { workers: 2, dataset: "100 MB", seconds: 17.121, efficiency: 0.27 },
  { workers: 4, dataset: "200 MB", seconds: 20.028, efficiency: 0.23 },
];

export const ioProfile = [
  { name: "Read only", seconds: 0.048 },
  { name: "Parse only", seconds: 5.583 },
  { name: "Parse + analyze", seconds: 8.955 },
];

export const showcaseRun = {
  dataset: "synth_100mb.log",
  bytesLabel: "100 MB",
  records: 901_610,
  backend: "ProcessPool Static",
  workers: 8,
  chunks: 8,
  averageChunk: "12.5 MB",
  sequentialSeconds: 7.589,
  parallelSeconds: 3.899,
  speedup: 1.95,
  efficiency: 0.24,
  throughputK: 231,
  status: "completed",
};

// These percentages follow the deterministic synthetic generator weights. They are
// labelled "generator profile" in the UI, not presented as timed benchmark counters.
export const severityProfile = [
  { name: "INFO", value: 72, color: "#4F8CFF" },
  { name: "WARNING", value: 15, color: "#FFB020" },
  { name: "ERROR", value: 11, color: "#FF5C7A" },
  { name: "CRITICAL", value: 2, color: "#C77DFF" },
];

export const serviceProfile = [
  { name: "auth-service", value: 27 },
  { name: "booking-service", value: 25 },
  { name: "payment-service", value: 24 },
  { name: "catalog-api", value: 24 },
];

export const statusProfile = [
  { name: "2xx", value: 40, color: "#3DDC97" },
  { name: "4xx", value: 40, color: "#FFB020" },
  { name: "5xx", value: 20, color: "#FF5C7A" },
];

export const errorPatternProfile = [
  { key: "database_timeout", label: "Database timeout", value: 31 },
  { key: "authentication_failure", label: "Authentication failure", value: 25 },
  { key: "sql_syntax", label: "SQL syntax", value: 18 },
  { key: "upstream_502", label: "Upstream 502", value: 14 },
  { key: "gateway_unreachable", label: "Gateway unreachable", value: 8 },
  { key: "crash_loop", label: "Crash loop", value: 4 },
];

export const evidencePreview = {
  endpoints: [
    { key: "/api/login", count: 16_482 },
    { key: "/api/bookings", count: 14_901 },
    { key: "/api/payments", count: 13_774 },
    { key: "/api/catalog", count: 12_996 },
  ],
  ips: [
    { key: "192.0.2.28", count: 1_864 },
    { key: "203.0.113.10", count: 1_807 },
    { key: "192.0.2.14", count: 1_742 },
    { key: "203.0.113.5", count: 1_696 },
  ],
};

export const securityPreview = [
  {
    id: "auth-burst",
    type: "Repeated authentication failures",
    severity: "HIGH",
    confidence: 0.86,
    source: "203.0.113.5",
    service: "auth-service",
    events: 428,
    evidence: "401 responses and failed-password messages in minute buckets",
    recommendation: "Review account targets and rate-limit history.",
  },
  {
    id: "path-scan",
    type: "Sensitive path access",
    severity: "MEDIUM",
    confidence: 0.78,
    source: "192.0.2.28",
    service: "catalog-api",
    events: 96,
    evidence: "Requests included /.env and /admin paths",
    recommendation: "Confirm edge filtering and inspect related endpoints.",
  },
  {
    id: "404-burst",
    type: "Elevated 404 activity",
    severity: "MEDIUM",
    confidence: 0.73,
    source: "192.0.2.14",
    service: "booking-service",
    events: 311,
    evidence: "Concentrated not-found responses from one source",
    recommendation: "Compare paths against known clients and crawler policy.",
  },
];

export const showcaseJobs = [
  {
    id: "showcase-500",
    dataset: "synth_500mb.log",
    size: "500 MB",
    backend: "ProcessPool",
    workers: 12,
    seconds: 17.287,
    speedup: 2.53,
    status: "completed",
  },
  {
    id: "showcase-100",
    dataset: "synth_100mb.log",
    size: "100 MB",
    backend: "ProcessPool",
    workers: 8,
    seconds: 3.899,
    speedup: 1.95,
    status: "completed",
  },
  {
    id: "showcase-omp",
    dataset: "synth_10mb.log",
    size: "10 MB",
    backend: "OpenMP",
    workers: 8,
    seconds: 0.516,
    speedup: 2.3,
    status: "completed",
  },
  {
    id: "showcase-mpi",
    dataset: "synth_10mb.log",
    size: "10 MB",
    backend: "MPI",
    workers: 4,
    seconds: 1.445,
    speedup: 1.63,
    status: "completed",
  },
];

export const glossary: Record<string, string> = {
  HPC: "High-Performance Computing: using parallel hardware and measured algorithms to solve large workloads faster.",
  Speedup: "Sequential execution time divided by parallel execution time.",
  Efficiency: "Speedup divided by the number of workers. It shows how effectively workers are used.",
  MPI: "Message Passing Interface: independent ranks exchange data through explicit communication.",
  OpenMP: "A shared-memory model where native threads process work inside one program.",
  ProcessPool: "Independent Python operating-system processes that can execute on multiple CPU cores.",
  Rank: "One independently executing MPI process.",
  Reduction: "Combining worker partial results into one deterministic global result.",
};
