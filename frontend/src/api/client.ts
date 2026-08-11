const TOKEN_KEY = "pli_token";
const BASE = import.meta.env.VITE_API_BASE ?? "";

export type JobStatus = {
  job_id: number;
  status: string;
  dataset_id?: number | null;
  processing_mode?: string | null;
  worker_count?: number | null;
  execution_backend?: string | null;
  schedule?: string | null;
  chunks_per_worker?: number | null;
  parser_version?: string | null;
  analysis_version?: string | null;
  configuration_hash?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

export type Dataset = {
  id: number;
  filename: string;
  format: string;
  size_bytes: number;
  checksum: string;
  created_at: string;
};

export type Capabilities = {
  execution_backend: string;
  execution_backends?: string[];
  backend_status?: Record<string, { available?: boolean; detail?: string }>;
  max_workers: number;
  max_upload_bytes: number;
  parsers: string[];
  modes: string[];
  schedules?: string[];
  parser_version: string;
  analysis_version: string;
};

export type AnalysisResult = {
  job_id: number;
  status: string;
  summary: Record<string, unknown>;
  errors: Record<string, unknown>;
  security: { findings?: Finding[] } & Record<string, unknown>;
  evidence: Record<string, unknown>;
  ai_report: string | null;
  execution_backend: string;
  parser_version: string;
  analysis_version: string;
  configuration_hash: string;
};

export type Finding = {
  finding_id?: string;
  type?: string;
  severity?: string;
  summary?: string;
  confidence?: number;
  source_ips?: string[];
  event_count?: number;
};

export type BenchmarkRow = {
  workers: number;
  mode: string;
  run_number: number;
  elapsed_sec: number;
  throughput_lines_per_sec?: number | null;
  speedup?: number | null;
  efficiency?: number | null;
};

export type BenchmarkOut = {
  job_id: number;
  status: string;
  rows: BenchmarkRow[];
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  if (response.status === 401) {
    setToken(null);
    throw new ApiError(401, "Not authenticated");
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail
          ? JSON.stringify(data.detail)
          : response.statusText;
    throw new ApiError(response.status, detail, data);
  }
  return data as T;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export const api = {
  register: (email: string, password: string) =>
    request<{ access_token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  capabilities: () => request<Capabilities>("/api/system/capabilities"),
  datasets: () => request<Dataset[]>("/api/datasets"),
  uploadDataset: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Dataset>("/api/datasets", { method: "POST", body: form });
  },
  jobs: () => request<JobStatus[]>("/api/jobs"),
  job: (id: number) => request<JobStatus>(`/api/jobs/${id}`),
  createJob: (body: {
    dataset_id: number;
    mode: string;
    workers: number;
    format?: string;
    execution_backend?: string;
    schedule?: string;
    chunks_per_worker?: number;
  }) =>
    request<{ job_id: number; status: string }>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  results: (id: number) => request<AnalysisResult>(`/api/jobs/${id}/results`),
  aiSummary: (id: number) =>
    request<{ ai_report?: string | null; ollama_available: boolean; detail?: string }>(
      `/api/jobs/${id}/ai-summary`,
      { method: "POST" },
    ),
  createBenchmark: (body: {
    dataset_id: number;
    workers: number[];
    runs: number;
    format?: string;
    execution_backend?: string;
    schedule?: string;
    chunks_per_worker?: number;
  }) =>
    request<{ job_id: number; status: string }>("/api/benchmarks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  benchmark: (id: number) => request<BenchmarkOut>(`/api/benchmarks/${id}`),
};
