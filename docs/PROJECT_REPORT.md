# Project Report

**AI-Powered Parallel Log Intelligence Platform**

**Course:** CSE 471 — Introduction to High Performance Computing  
**Stage:** 2 — ProcessPool, dynamic scheduling, OpenMP, single-node MPI  
**Hardware measured:** Intel Core i5-1235U · 12 logical processors · 12 GB RAM · Intel Iris Xe · Windows 10  
**Repository:** https://github.com/galibhasan720/Parallel-Log-Analysis  

*All performance numbers are measured. None are invented. Longer draft: PROJECT_REPORT_FULL.md. Full tables: PERFORMANCE.md.*

---

## Abstract

This project is a high-performance engine for large **offline log files** on ordinary multi-core CPUs. Logs record logins, errors, slow requests, and suspicious activity. When something breaks, people search those files. A day’s log can be hundreds of megabytes. One-core reading wastes the rest of the CPU and delays **time-to-understand**.

The engine splits a file into newline-aligned chunks, analyses chunks in parallel, and merges small partial counts into one correct report. A FastAPI + React app lets a user upload a file, choose a backend, and watch a job finish. Optional local AI (Ollama) explains **aggregates only**, never the raw file. No GPU is required.

On the measured laptop, 100 MB sequential time is **7.589 s**; eight workers take **3.899 s** (**S₈ ≈ 1.95×**). 500 MB sequential time is **43.732 s**; twelve workers take **17.287 s** (**S₁₂ ≈ 2.53×**). Speedup is sublinear on a hybrid CPU. Sequential equals parallel (pytest). CUDA was rejected: Iris Xe has no CUDA device. This is a **course HPC prototype** of the observability idea — not Splunk, Elastic, or Datadog.

---

## 1. Introduction and problem

Software systems write **logs**. The cost is not disk space; it is how long until a human sees error counts, failing services, and evidence of abuse.

**Analogy.** A 500-page incident report: one reader is slow; eight readers of chapters are faster **if** nobody double-counts pages and they merge counts the same way.

On this i5-1235U, sequential analysis of a **100 MB** synthetic log (901,610 lines) takes **7.589 s**. A **500 MB** file (4,508,066 lines) takes **43.732 s**.

**One sentence.** We analyse a large log with many CPU cores at once, publish honest speedup, and optionally summarise the evidence with local AI.

Two systems must stay separate:

- **System A — HPC engine** — CLI, no website.  
- **System B — Product** — login, upload, jobs, dashboards; *calls* the engine.

Stage 1 was a ProcessPool prototype. Stage 2 adds dynamic chunks, OpenMP, and single-node MPI so the work matches CSE 471 models without pretending a GPU exists. Sequential analysis underuses cores and delays review as log volume grows.

---

## 2. Objectives

| # | Objective | Status |
| - | --------- | ------ |
| 1 | Sequential ≡ parallel | Met (pytest) |
| 2 | Measurable speedup on ≥ 100 MB | Met (100 and 500 MB) |
| 3 | Strong + weak scaling documented | Met |
| 4 | Engine without the web stack | Met (CLI) |
| 5 | Register → upload → job → results | Met |
| 6 | Process, dynamic, OpenMP, MPI | Met |
| 7 | Optional AI on aggregates | Met (503 if Ollama down) |
| 8 | No fabricated times | Met |

Pillars: correctness, performance, scalability, evidence, modularity.

---

## 3. Why this for CSE 471

| CLO | Evidence |
| --- | -------- |
| CLO1 Measure models | \(S_p\), \(E_p\), strong and weak scaling |
| CLO2 CLI / scripts | `python -m hpc_engine.analyze` |
| CLO3 Jobs | queued → completed (not Slurm) |

Weeks 5–7: native OpenMP (`#pragma omp parallel for`). Weeks 8–10: single-node `mpi4py` + `mpiexec`. Weeks 11–14 GPU: **not implemented** — Iris Xe has **no CUDA device**. Suitability evaluation is a course outcome.

**Why logs, not matrix multiply?** Industry workload; embarrassingly parallel after chunking; correctness is non-trivial (bad boundaries drop or duplicate lines); 100–500 MB is enough to measure on a laptop. HPC includes shared-memory multi-core work, not only supercomputers.

---

## 4. How it works

```text
File → newline-aligned chunks → parallel workers → partial counts → merge → report
     → optional local AI on aggregates only
```

Chunks start at a newline (except the first) so a log line is never split or counted twice. Workers count; they do not compute global top-N. The reducer adds counts; top-N and **findings** (evidence, not “definitely an attack”) are finalised after merge.

| Backend | Plain meaning |
| ------- | ------------- |
| process | Python ProcessPool — default, larger files |
| dynamic | Many small chunks — uneven work |
| openmp | Native C threads — often fastest on small files |
| mpi | Message-passing on **one node** — not a cluster yet |

Python threads are a poor fit (GIL) for this CPU-bound parse loop. Processes, OpenMP, and MPI are the three course paradigms. Chunk starts (except the first) seek to a newline so lines are not split or double-counted — the reason sequential and parallel totals can match.

---

## 5. Implementation

| Layer | Choice |
| ----- | ------ |
| Language | Python 3.12 + optional OpenMP C |
| API / DB / UI | FastAPI, SQLite, React 18 + Vite |
| Auth / AI | JWT; Ollama optional |

Jobs persist `schedule` and `chunks_per_worker`. Web upload is **one** `.log`/`.txt` file. Directories are **CLI only**. AI prompts are capped aggregates (~8 KB), not the raw log.

---

## 6. Experiments and results

**Protocol.** Warm-up discarded; three timed runs; `time.perf_counter`; same file/parser/analysis. \(S_p = T_1/T_p\), \(E_p = S_p/p\). Large files are not in git; faculty can demo `data/samples/synth_small.log`. Run-by-run values: PERFORMANCE.md.

### 100 MB strong scaling (best: 8 workers)

| p | Mean s | \(S_p\) | \(E_p\) |
| - | ------ | ------- | ------- |
| 1 | 7.589 | 1.00 | 1.00 |
| 2 | 5.663 | 1.34 | 0.67 |
| 4 | 4.497 | 1.69 | 0.42 |
| 6 | 4.535 | 1.67 | 0.28 |
| **8** | **3.899** | **1.95** | **0.24** |
| 12 | 4.327 | 1.75 | 0.15 |

Throughput: 13.2 MB/s at \(p=1\) → 25.6 MB/s at \(p=8\).

### 500 MB strong scaling (best: 12 workers)

| p | Mean s | \(S_p\) | \(E_p\) |
| - | ------ | ------- | ------- |
| 1 | 43.732 | 1.00 | 1.00 |
| 2 | 33.735 | 1.30 | 0.65 |
| 4 | 24.414 | 1.79 | 0.45 |
| 6 | 20.455 | 2.14 | 0.36 |
| 8 | 17.947 | 2.44 | 0.30 |
| **12** | **17.287** | **2.53** | **0.21** |

Throughput: 11.4 MB/s at \(p=1\) → 28.9 MB/s at \(p=12\).

**CPU-bound (100 MB sequential).** Read-only **0.048 s**; parse-only **5.583 s**; parse+analyse **8.955 s**. Disk is ~0.5% of the work.

**Weak scaling (~50 MB per worker).** Means: 4.552 s (\(p=1\)), 17.121 s (\(p=2\)), 20.028 s (\(p=4\)). Wall-clock **rises**; efficiency is low. Published anyway.

On **10 MB**, OpenMP often wins wall-clock (no process spawn). Prefer 100/500 MB tables for ProcessPool scaling.

**Why not 12×?** Hybrid 2P+8E + SMT; spawn, pickle, merge. On 100 MB, \(p=12\) **lost** to \(p=8\). Prefer measured ~2× over promised 12×.

**Viva (short).** HPC without a cluster? Yes — multi-core, reduction, scaling metrics. Why not threads? GIL. Does AI read the log? No.

---

## 7. Industry, scope, how to run

Splunk/Elastic/Datadog are **production** ingest and search. They already parallelise inside. This repo **teaches and measures** the mechanism. It does not replace them.

**Did:** laptop multi-paradigm HPC; 100/500 MB measured; UI + CLI; parity tests.  
**Did not:** CUDA; multi-node MPI; streaming; production SIEM; experiments C/D/E; psutil CPU%.

**Run on any PC** (README “What they need” and “Happy path”). Need: Windows 10/11 (or macOS/Linux), Git, Python **3.12**, Node **20 LTS**, two terminals. Not needed: GPU, WSL, `E:` datasets, 100/500 MB files.

1. Clone; `py -3.12 -m venv .venv`; activate; `pip install -r requirements.txt` (comment out `mpi4py` if it fails).  
2. Terminal 1: `$env:PYTHONPATH = "backend"`; `python backend\scripts\reset_db.py`; Uvicorn on **8000**.  
3. Terminal 2: `cd frontend`; `npm install`; `npm run dev` (**5173**).  
4. UI → **Register** then Login (demo email does not exist until you register).  
5. Upload `data/samples/synth_small.log`; backend **process**; 2–4 workers; wait for **completed**.

CLI: `python -m hpc_engine.analyze --input data/samples/synth_small.log --backend process --mode parallel --workers 4`.

---

## 8. Conclusion

Parallel log analysis on a student CPU is real HPC: decompose, map, reduce, publish speedup that survives scrutiny. Best measured speedups: **1.95×** (100 MB, 8 workers) and **2.53×** (500 MB, 12 workers). Sequential equals parallel. CUDA is out of scope on Iris Xe. Optional AI translates evidence; it does not read the raw log.

---

## Glossary

| Term | Meaning |
| ---- | ------- |
| Chunk | Byte range aligned to full lines |
| Partial result | Counts from one chunk, not every line |
| Speedup \(S_p\) | \(T_1 / T_p\) |
| Efficiency \(E_p\) | \(S_p / p\) |
| Strong scaling | Fixed size, more workers |
| Weak scaling | Size grows with workers |
| Finding | Evidence pattern, not a verdict |
| System A / B | Engine vs product |

---

## References

1. https://github.com/galibhasan720/Parallel-Log-Analysis  
2. `docs/PERFORMANCE.md`  
3. `docs/COURSE_ALIGNMENT.md`  
4. `docs/FACULTY_BRIEFING.md`  
5. `README.md` (faculty runbook)  
