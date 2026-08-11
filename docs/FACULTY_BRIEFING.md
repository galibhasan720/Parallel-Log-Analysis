# Faculty Briefing — AI-Powered Parallel Log Intelligence Platform

**Course:** CSE 471 / Parallel Programming / High-Performance Computing  
**Stage:** 2 — course-aligned multi-paradigm CPU HPC (ProcessPool + dynamic + OpenMP + single-node MPI)  
**Hardware measured:** 12th Gen Intel Core i5-1235U · 12 logical processors (2P+8E, HT) · 12 GB DDR4 · Iris Xe · NVMe · Windows 10  
**Repo:** [galibhasan720/Parallel-Log-Analysis](https://github.com/galibhasan720/Parallel-Log-Analysis) · Stage 1 tag `v1.0.0`  
**Board:** [Parallel Log Intelligence](https://github.com/users/galibhasan720/projects/7)
**Course map:** [COURSE_ALIGNMENT.md](COURSE_ALIGNMENT.md)

Use this file to **understand**, **present**, and **defend** the project. Numbers below are **measured**, not invented. Full tables live in [PERFORMANCE.md](PERFORMANCE.md).

---

## 1. Elevator pitch (non-tech + industry)

Every modern product — banks, hospitals, ride-sharing apps, university portals — writes **logs**: timestamped text that records logins, errors, slow requests, and suspicious activity. When something breaks, engineers must search those logs. A single day’s file can be hundreds of megabytes or more. Reading it **one line at a time on one CPU core** wastes the rest of the laptop or server.

This project is a **high-performance log analysis engine**. It splits a large log file across several CPU cores, each core counts errors, services, IPs, and security-related patterns on its own slice, then the results are merged into one report. A small local AI (Ollama) can explain that report in plain language. It does **not** send logs to the cloud and does **not** need a GPU.

**Industry framing:** this is the same idea behind observability and incident investigation (faster mean-time-to-understand), implemented as a student HPC prototype — not a replacement for Splunk, Elastic, or Datadog.

**One sentence:** *We use parallel computing so a large log file is analyzed by many CPU cores at once, then we show honest speedup numbers and an optional AI summary of the evidence.*

---

## 2. What problem it solves — and how (the main thing)

### 2.1 The problem (plain language)

Imagine a 500-page incident report. One person reading every page is slow. Eight people each reading a chapter, then combining “how many errors, which service, which IP” is faster — **if** they do not double-count pages and they merge numbers the same way.

On this laptop, processing a **100 MB** synthetic log sequentially takes about **7.6 seconds**. A **500 MB** file takes about **44 seconds**. That is already painful for interactive investigation, and real production logs are often larger.

Traditional sequential analysis:

- underuses multi-core CPUs
- delays debugging and security review
- does not scale as log volume grows

### 2.2 How this project solves it (the HPC idea)

```text
Large log file
    → split into byte chunks (one chunk per worker)
    → align each chunk to a full line (no broken records)
    → each worker process parses + analyzes its chunk
    → each worker returns a small “partial result” (counts, histograms)
    → a reducer merges partials into one global result
    → (optional) AI explains the aggregates only
```

That pipeline is **High-Performance Computing on one machine**: workload decomposition, parallel workers, and a deterministic reduction.

### 2.3 Where AI fits (and where it does not)

AI is **not** the HPC engine. Ollama (`llama3.2:3b`) only sees **already-computed totals and findings**, never the raw multi-hundred-MB file. If Ollama is down, the API returns 503 and the UI still shows analytics. Faculty can grade the parallel engine without the LLM.

---

## 3. Why this project for an HPC / Parallel Programming course

### 3.1 The parallel system we actually use

| Question | Answer for faculty |
| -------- | ------------------ |
| **MPI?** | **Yes (Stage 2).** Single-node `mpi4py` + `mpiexec`. |
| **OpenMP?** | **Yes (Stage 2).** Native C worker with `#pragma omp parallel for`. |
| **CUDA / GPU?** | **No.** Iris Xe has no CUDA. Documented suitability decision. |
| **ProcessPool?** | **Yes.** Still the default `process` / `dynamic` backends. |
| **Memory model** | Shared-memory (process + OpenMP) + MPI message-passing API on one node. |
| **Future multi-node?** | Same `ExecutionBackend` / partial contract; not built. |

**Say this out loud:** *“Stage 2 is laptop HPC with three paradigms — ProcessPool, OpenMP, and single-node MPI — measured side by side. CUDA is unsuitable on Iris Xe.”*

Why processes, not Python threads? Parsing and histogram updates are **CPU-bound**. CPython’s **GIL** prevents multiple threads from running Python bytecode at the same time, so pure-Python threads would not speed up this workload. Separate processes each have their own interpreter. **OpenMP** covers shared-memory native threads in C; **MPI** covers the message-passing programming model on a single node (teaching path to multi-node).

### 3.2 Course topics mapped to the repo

| HPC / parallel topic | Where it appears here |
| -------------------- | --------------------- |
| Workload decomposition | Byte-range chunks: file size \(T\) split into \(N\) ranges |
| Boundary alignment | Peek-back / newline align so no line is split or duplicated |
| Static scheduling | \(N\) equal chunks → \(N\) workers (mandatory Stage 1) |
| Process-level parallelism | `ProcessPoolExecutor` in `backend/app/hpc/engines/parallel.py` |
| Reduction / aggregation | Associative `PartialResult` + `merge_partials` |
| Correctness under parallelism | Sequential ≡ parallel (pytest) |
| Speedup | \(S_p = T_1 / T_p\) |
| Efficiency | \(E_p = S_p / p\) |
| Strong scaling | Fixed problem size (100 MB or 500 MB); increase workers \(p\) |
| CPU-bound vs I/O-bound | Read-only ~0.05 s vs parse+analyze ~9 s on 100 MB → **CPU-bound** |
| Honest performance engineering | Sublinear speedup on hybrid P/E cores; no fabricated times |

This is still **valid HPC**. HPC is not only supercomputers and MPI. Shared-memory multi-core processing, scaling metrics, and reduction algorithms are core HPC.

### 3.3 Why *this* application (logs) instead of a textbook matrix multiply?

1. **Real industry workload** — observability, SRE, security operations. Faculty from industry care about this domain.
2. **Embarrassingly parallel after chunking** — once lines are assigned, workers do not need to talk until reduce. That is a clean parallel story.
3. **Correctness is non-trivial** — wrong chunk boundaries duplicate or drop lines. Parity tests prove the parallel algorithm is not “faster but wrong.”
4. **Measurable on student hardware** — 100–500 MB on an i5-1235U is enough to show \(T_1\), \(S_p\), \(E_p\) without a cluster.
5. **Extensible** — same engine can later sit behind MPI, streams, or more parsers without throwing away the UI.

---

## 4. How the system actually works

Full freeze: [architecture/system.md](architecture/system.md) · HPC details: [architecture/hpc-engine.md](architecture/hpc-engine.md).

### 4.1 Two systems (do not mix them up)

**System A — Computation engine (the HPC core)**

```text
Input → Ingestion → Workload Decomposition → Scheduling
  → Parallel Processing → Local Aggregation → Global Reduction
  → Structured Analytical Evidence
```

- Independent of React, FastAPI, SQLite, JWT, and Ollama.
- Runs from the CLI alone.
- Uses `ProcessPoolExecutor`. Chunk specs and partials must be **picklable** (serializable across process boundaries).

**System B — Product layer (the software wrapper)**

```text
React → FastAPI → Job Management → ExecutionBackend → HPC Engine
  → Results → Dashboard → AI Explanation
```

Orchestrates System A. **Does not contain** the core parallel algorithm. Jobs call `LocalProcessBackend.execute(job_spec)` from a background thread — routes never open a process pool themselves.

If faculty says “show me HPC, not a website,” open the **CLI**. If they say “would industry use this,” show the **UI + job lifecycle**.

### 4.2 Four frozen abstractions

| Abstraction | Meaning in plain language | Stage 1 |
| ----------- | ------------------------- | ------- |
| **Canonical Log Event** | One parsed log line: time, level, service, message | `LogEvent` |
| **Analysis Job** | A work order: which file, sequential or parallel, how many workers | queued → running → aggregating → completed / failed |
| **Partial Result / Evidence** | Small mergeable counts — **not** dumping millions of raw lines back | histograms + finding counters |
| **Execution Backend** | “Who runs the engine?” Today: local processes. Tomorrow: MPI/cluster | `LocalProcessBackend` |

These four exist so Stage 6 (distributed / streaming) does not force a rewrite of the dashboard.

### 4.3 Pipeline (what happens on one parallel run)

```mermaid
flowchart LR
  File[LogFile]
  Chunk[ByteChunks]
  Align[NewlineAlign]
  Workers[WorkerProcesses]
  Partials[PartialResults]
  Reduce[DeterministicReduce]
  Final[FindingsAndTopN]
  AI[OptionalOllama]

  File --> Chunk --> Align --> Workers --> Partials --> Reduce --> Final --> AI
```

1. **Input** — `FileInputSource` reads an offline file (directories/streams are future).
2. **Decompose** — static scheduler: \(N\) byte ranges for \(N\) workers.
3. **Align** — each chunk start (except the first) seeks to the next newline so a record is never split.
4. **Parse** — `ParserRegistry` → application-log parser → `LogEvent`.
5. **Analyze in workers** — level/status/service histograms, error patterns, security heuristic counters. Workers **do not** compute global top-N (that would not be associative).
6. **Reduce** — `merge_partials` adds counts. Same math as sequential, different order of association.
7. **Finalize** — top-N lists and security **findings** (evidence language, not “this is definitely an attack”).
8. **Optional AI** — prompt built from aggregates only (capped, ~8 KB), never raw logs.

### 4.4 Sequential vs parallel (same brain, different number of workers)

- Sequential: one process walks the whole file (`workers = 1` conceptually).
- Parallel: \(N\) processes each walk a chunk, then merge.
- **Same analysis functions.** The only structural difference is decompose → map → reduce.
- **Non-negotiable:** totals, valid/invalid counts, errors, services, status codes, security findings, and statistics must match. Pytest enforces this.

---

## 5. Does this fill faculty / HPC course criteria?

**Short answer:** Yes for a Stage-2 **multi-paradigm CPU HPC** project (ProcessPool + dynamic + OpenMP + single-node MPI) with performance engineering and correctness. No if the rubric secretly requires multi-node clusters, CUDA GPUs, or production SIEM. Be explicit about that scope in the first minute.

### 5.1 Five non-negotiable pillars

| Pillar | Required meaning | Status |
| ------ | ---------------- | ------ |
| **1. Correctness** | Sequential == Parallel | Yes — pytest parity (OpenMP/MPI when runtimes present) |
| **2. Performance** | Measurable speedup | Yes — \(S_8 \approx 1.95\) (100 MB), \(S_{12} \approx 2.53\) (500 MB) |
| **3. Scalability** | Strong + weak scaling | Yes — strong scaling + weak scaling matrix in PERFORMANCE.md |
| **4. Evidence** | Real benchmark data | Yes — [PERFORMANCE.md](PERFORMANCE.md), JSON summaries, backend compare |
| **5. Modularity** | HPC engine independent from the web app | Yes — CLI without FastAPI |

### 5.2 Definition of Done (Implementation Guide §20.4)

| # | Criterion | Met? |
| - | --------- | ---- |
| 1 | Public GitHub + README + architecture docs | Yes |
| 2 | Parallel engine with measurable speedup on ≥ 100 MB | Yes (100 MB and 500 MB) |
| 3 | Sequential ≡ parallel aggregates | Yes |
| 4 | HPC engine runnable from CLI without the web stack | Yes |
| 5 | FastAPI + React path: upload → results | Yes |
| 6 | AI **or** high-quality templated explanation from evidence | Yes — Ollama + 503 fallback |
| 7 | PERFORMANCE.md with real i5-1235U numbers | Yes |
| 8 | CI green on `main` | Yes (pytest + frontend build) |
| 9 | Demo script ≤ 5 minutes | Yes — [DEMO_SCRIPT.md](DEMO_SCRIPT.md) |

### 5.3 What we do **not** claim (say this before they attack scope)

- Not multi-node / Slurm cluster MPI (single-node `mpi4py` teaching path **is** implemented)
- Not CUDA / GPU (Iris Xe — unsuitable)
- Not Kafka, Elasticsearch, Kubernetes
- Not a production SIEM or Splunk replacement
- Not GPU / deep-learning anomaly detection
- Not real-time streaming ingestion
- Stretch Experiments C/D/E (chunk matrix, parser opt, aggregation strategies) not run — honest
- Stage 2 is laptop multi-paradigm HPC; Stages 3–6 (cluster / streaming / production / AI ops) remain future

Honesty here is a strength. Industry and strict faculty prefer measured sublinear speedup over fake “12× on 12 cores.”

---

## 6. Measured results (speak **only** these numbers)

**Machine:** i5-1235U · 12 logical processors · 12 GB RAM · NVMe  
**Protocol:** warm-up discarded; 3 timed runs; `time.perf_counter`; same file/parser/analysis.

### 6.1 100 MB (`synth_100mb.log` — 901,610 lines)

| Workers \(p\) | Mean s | Speedup \(S_p\) | Efficiency \(E_p\) |
| ------------- | ------ | --------------- | ------------------ |
| 1 (\(T_1\)) | 7.589 | 1.00 | 1.00 |
| 2 | 5.663 | 1.34 | 0.67 |
| 4 | 4.497 | 1.69 | 0.42 |
| 6 | 4.535 | 1.67 | 0.28 |
| **8 (best)** | **3.899** | **1.95** | **0.24** |
| 12 | 4.327 | 1.75 | 0.15 |

Throughput: \(p=1\) → \(1.19\times10^5\) lines/s · 13.2 MB/s. \(p=8\) → \(2.31\times10^5\) lines/s · 25.6 MB/s.

### 6.2 500 MB (`synth_500mb.log` — 4,508,066 lines)

| Workers \(p\) | Mean s | Speedup \(S_p\) | Efficiency \(E_p\) |
| ------------- | ------ | --------------- | ------------------ |
| 1 (\(T_1\)) | 43.732 | 1.00 | 1.00 |
| 2 | 33.735 | 1.30 | 0.65 |
| 4 | 24.414 | 1.79 | 0.45 |
| 6 | 20.455 | 2.14 | 0.36 |
| 8 | 17.947 | 2.44 | 0.30 |
| **12 (best)** | **17.287** | **2.53** | **0.21** |

Throughput: \(p=1\) → \(1.03\times10^5\) lines/s · 11.4 MB/s. \(p=12\) → \(2.61\times10^5\) lines/s · 28.9 MB/s.

### 6.3 Why not linear speedup? (they will ask)

The CPU is **hybrid**: 2 Performance cores + 8 Efficiency cores + hyper-threading = 12 logical processors. Extra workers beyond ~6–8 share weaker E-cores and SMT. Process spawn + pickle + merge also cost time (Amdahl’s serial fraction).

- On **100 MB**, 12 workers **lost** to 8: overhead bigger than remaining work.
- On **500 MB**, 12 still wins mean wall-clock: more parse work **amortizes** spawn. Efficiency is still only 0.21.

**That is expected.** Claiming \(S_{12}=12\) on this chip would be dishonest.

### 6.4 CPU-bound, not disk-bound (100 MB sequential profiles)

| Mode | Mean s |
| ---- | ------ |
| Read-only (bytes only) | 0.048 |
| Parse-only | 5.583 |
| Parse + analyze | 8.955 |

Disk read is ~0.5% of parse+analyze. **Classify: CPU-bound.** That is why extra processes help, and why threads would not (GIL).

---

## 7. How to run this project

Work from the **repo root**. Python **3.12** venv. Set `PYTHONPATH=backend` so `app` and `hpc_engine` import.

### 7.1 One-time setup (Windows PowerShell)

```powershell
cd "E:\Galib\IUB\IUB-Semester 9\Parallel Programming\Project\Parallel Log Analysis"
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:PYTHONPATH = "backend"
```

WSL2 Ubuntu 24.04 is also supported (see [SETUP.md](SETUP.md)). Prefer WSL for multiprocessing that matches Linux servers; Windows venv works for demo.

### 7.2 System A — HPC CLI (no website required)

```powershell
$env:PYTHONPATH = "backend"

# Sequential baseline
python -m hpc_engine.analyze --input data/samples/synth_small.log --mode sequential

# Parallel (4 worker processes)
python -m hpc_engine.analyze --input data/samples/synth_small.log --mode parallel --workers 4
```

Tiny sample in git: `data/samples/synth_small.log` (~256 KB, 2,258 lines).  
Large files (not in git): `E:\datasets\log-intelligence\generated\synth_100mb.log`, `synth_500mb.log`.

If 500 MB is missing:

```powershell
python backend/scripts/generate_synthetic_logs.py --also-500mb
```

### 7.3 System B — API (FastAPI)

```powershell
$env:PYTHONPATH = "backend"
$env:JWT_SECRET = "set-a-real-secret-before-demo"   # default dev secret exists; override for demo
python backend/scripts/reset_db.py                  # optional: fresh SQLite
uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
```

- Swagger: http://127.0.0.1:8000/docs  
- Root `/` redirects to `/docs`  
- DB: `backend/data/app.db` (gitignored)

Register a user in the UI or via `POST /api/auth/register`, then login (`POST /api/auth/login`). Upload a dataset, create a job, poll until `completed`, fetch results.

### 7.4 React UI

Keep uvicorn running. Second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173** (Vite proxies `/api` → `:8000`).

Views: Dashboard, New Analysis, Analysis Result, Benchmark chart. Login gate uses JWT.

### 7.5 Tests (correctness for faculty)

```powershell
$env:PYTHONPATH = "backend"
pytest backend/tests
```

Parity tests prove sequential aggregates ≡ parallel aggregates.

### 7.6 Benchmarks (do not invent times)

Stop Vite and Ollama during official timed runs.

```powershell
$env:PYTHONPATH = "backend"
python backend/scripts/run_benchmarks.py
```

Results: `docs/PERFORMANCE.md` and `benchmarks/results/experiment_a_synth_*_summary.json`.

### 7.7 Optional AI

Ollama on Windows (already used in this project): model `llama3.2:3b` at `http://127.0.0.1:11434`.  
In the UI: **Generate AI Report**. If Ollama is down → **503 + fallback**, analytics still work.

---

## 8. Tricky faculty Q&A (study this hard)

### Q1. Is this MPI or OpenMP?

**Stage 2: both, plus ProcessPool.**  
- **ProcessPool** (`process` / `dynamic`): Python `ProcessPoolExecutor`  
- **OpenMP**: native C worker with `#pragma omp parallel for` (`native/openmp_worker/`)  
- **MPI**: `mpi4py` + `mpiexec` on **one laptop node** (distributed-memory *programming model*)  
CUDA is still **not** used (Iris Xe). See [COURSE_ALIGNMENT.md](COURSE_ALIGNMENT.md).

### Q1b. Why three backends?

Same log-analysis problem under three CSE 471 paradigms → side-by-side \(S_p\)/\(E_p\) in PERFORMANCE.md. Competitors often ship only one OpenMP matrix multiply; this project shows **applied HPC + correctness parity**.

### Q1c. Is single-node MPI valid?

Yes for teaching the MPI API (ranks, gather, reduce). It is not a multi-node cluster claim. Cluster-lite shell scripts simulate submit/run/collect without Slurm.

### Q2. Then how is this HPC?

HPC is about **performance, parallelism, scaling metrics, and correct reduction**, not a specific library logo. We decompose a large workload, run it concurrently on multi-core CPU, measure \(S_p\) and \(E_p\), classify the bottleneck, and prove sequential ≡ parallel. That is HPC on a workstation. Supercomputers also start from these ideas; they add MPI/networks/GPUs.

### Q3. Why not threads?

CPU-bound Python + **GIL**. Threads would share one interpreter lock; parse time would barely drop. Processes give true multi-core execution. Cost: pickle + process start (visible in efficiency).

### Q4. Why is speedup only ~2× on 12 threads? Did parallelism fail?

No. **Sublinear speedup is expected** on a hybrid U-series CPU (2P+8E+HT). Efficiency falling to ~0.21–0.24 at high \(p\) matches Amdahl + spawn overhead + E-cores. On 100 MB, \(p=12\) is **worse** than \(p=8\); on 500 MB, \(p=12\) still wins. We report that honestly instead of faking \(S_{12}=12\).

### Q5. Is the AI the parallel part?

**No.** AI is an interpretation layer on aggregates. The engine does not need Ollama. If they press: “remove the LLM and the HPC thesis still stands.”

### Q6. How do you know parallel results are correct?

Same analysis functions; workers return **associative** partials (counts add); reducer is deterministic; pytest compares sequential vs parallel on `_COMPARE_KEYS` (totals, levels, status, services, findings, …). Chunk alignment prevents dropped/duplicated lines.

### Q7. Why synthetic logs? Real logs would be more impressive.

Synthetic logs give **controlled size, known checksums, and a stable parser format** so speedup is comparable. Checksums are in [DATASETS.md](DATASETS.md). Real formats (Apache, Loghub) are future parsers behind the same `LogEvent` model. Using unknown messy logs first would confound “parser bugs” with “parallel bugs.”

### Q8. Are “security findings” real attacks?

**No.** They are **heuristics + evidence** (failed logins, 5xx bursts, sensitive path hits, etc.). The UI/AI must not say “definitely an attack.” Industry SIEMs also start from signals, then humans investigate.

### Q9. Why FastAPI and React if this is an HPC course?

The product layer proves the engine is **usable** (jobs, versions, reproducibility fields). Faculty can grade **CLI + PERFORMANCE.md + pytest** alone. Industry wants both: a compute kernel and a way operators run it. The algorithm does not live in React.

### Q10. What would you do on a university cluster?

Keep System B. Implement `MpiBackend` (or Slurm array) behind `ExecutionBackend.execute(job_spec)`. Each rank processes a file region or file list; **same partial-result contract**; reduce at rank 0. UI unchanged. That is why the abstraction was frozen on Day 1.

### Q11. Is this I/O-bound? Logs are just reading disk.

Measured: read-only **0.048 s** vs parse+analyze **8.955 s** on 100 MB. NVMe is fast; regex + histograms dominate. **CPU-bound.**

### Q12. Why static scheduling, not work-stealing?

Stage 1 shipped equal byte chunks. Stage 2 adds a **dynamic** backend (many small chunks via ProcessPool) measured in PERFORMANCE.md Experiment B / backend compare. Static remains the default mental model for correctness; dynamic is available when chunk sizes vary.

### Q13. Python is slow. Why not C++?

We did add a **native OpenMP C worker** for shared-memory threads. Absolute parse time can still improve further; the **course learning outcomes** remain decomposition, processes/threads/ranks, reduction, and scaling metrics. Experiment D (parser optimization) is an optional stretch, not a reason to discard the parallel design.

### Q14. Can this replace ELK / Splunk?

**No.** Those are production platforms (ingest, index, HA, RBAC, retention). This is an academic HPC prototype that demonstrates **parallel analytics + honest benchmarks**. Position it as a learning / portfolio engine, not a vendor competitor.

### Q15. What is Stage 1 vs Stage 2 vs the long-term vision?

Stage 1 (v1.0.0): offline file, ProcessPool, one parser family, SQLite, React, optional local LLM.  
Stage 2 (current): `process` | `dynamic` | `openmp` | single-node `mpi`, course alignment docs, weak scaling + backend compare.  
Later (Stages 3–6): multi-node/cluster MPI, streams, production hardening, richer AI ops. Architecture docs already draw those boxes.

---

## 9. Five-minute demo talking track

Full script: [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Capture screenshots live into `docs/images/` — do not invent them.

| Time | What you say / show |
| ---- | ------------------- |
| 0:00–0:20 | **Problem.** Hundreds of MB of logs. Sequential 500 MB ≈ **44 s**. Iris Xe → no CUDA; CPU multi-paradigm instead. |
| 0:20–0:55 | **Architecture.** System A CLI vs System B UI. Backends: process / dynamic / OpenMP / single-node MPI. |
| 0:55–1:50 | **Run.** New Analysis: pick a backend, workers, Run. Status: queued → running → aggregating → completed. |
| 1:50–2:40 | **Results.** Totals, errors, top services, security **findings** (evidence, not “attack confirmed”). |
| 2:40–3:40 | **Benchmark / Performance.** 100 MB \(S_8 \approx 1.95\); 500 MB \(S_{12} \approx 2.53\); backend compare + weak scaling in PERFORMANCE.md. |
| 3:40–4:15 | **CLI.** OpenMP or `mpiexec` MPI analyze without FastAPI (or `--input-dir`). |
| 4:15–4:40 | **AI (optional).** Aggregates only — or Ollama-down fallback. |
| 4:40–5:00 | **Correctness + close.** `pytest` seq ≡ parallel. Honest PERFORMANCE.md. |

Backup if UI fails: run the CLI live on `synth_small.log`, then open PERFORMANCE.md tables.

---

## 10. Live pointers (open these if asked)

| Item | Where |
| ---- | ----- |
| This briefing | [docs/FACULTY_BRIEFING.md](FACULTY_BRIEFING.md) |
| Measured numbers | [docs/PERFORMANCE.md](PERFORMANCE.md) |
| How to install / run | [docs/SETUP.md](SETUP.md) |
| Datasets + checksums | [docs/DATASETS.md](DATASETS.md) |
| System A vs B | [docs/architecture/system.md](architecture/system.md) |
| Chunking / reduce | [docs/architecture/hpc-engine.md](architecture/hpc-engine.md) |
| 5-minute script | [docs/DEMO_SCRIPT.md](DEMO_SCRIPT.md) |
| Implementation manual | [IMPLEMENTATION_GUIDE.md](../Parallel%20log%20analysis/IMPLEMENTATION_GUIDE.md) |
| Proposal | [Final Project Proposal.md](../Parallel%20log%20analysis/Final%20Project%20Proposal.md) |
| GitHub repo | https://github.com/galibhasan720/Parallel-Log-Analysis |
| Release tag | `v1.0.0` |
| Project board | https://github.com/users/galibhasan720/projects/7 |
| Parallel engine source | `backend/app/hpc/engines/` (`parallel`, `dynamic`, `openmp`, `mpi`) |
| Backend registry | `backend/app/execution/registry.py` |
| CLI entry | `python -m hpc_engine.analyze` |
| Course alignment | [docs/COURSE_ALIGNMENT.md](COURSE_ALIGNMENT.md) |

---

## 11. One-page memory card (night before)

- **What:** Parallel log analytics on CPU (multi-paradigm).  
- **Why HPC:** Large logs + multi-core; decompose, map, reduce, measure \(S_p\) / \(E_p\).  
- **Which APIs:** **ProcessPool** + **dynamic** + **OpenMP** + **single-node MPI** (no CUDA).  
- **Correctness:** sequential ≡ parallel.  
- **Best numbers:** 100 MB \(S_8 \approx 1.95\); 500 MB \(S_{12} \approx 2.53\); OpenMP strong on 10 MB.  
- **Bound:** CPU, not disk.  
- **AI:** optional, aggregates only.  
- **Scope:** Stage 2 laptop HPC; multi-node cluster / streaming are future.  
- **Industry:** faster investigation prototype, not Splunk.  
- **If they only allow CLI:** System A still stands.

---

*End of briefing. Do not quote times that are not in PERFORMANCE.md.*
