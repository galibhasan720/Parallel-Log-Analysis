# Resume / portfolio bullets (Stage 1)

Customize from [IMPLEMENTATION_GUIDE.md](../Parallel%20log%20analysis/IMPLEMENTATION_GUIDE.md) §19 using **measured** i5-1235U numbers (`docs/PERFORMANCE.md`).

## Resume bullets

- Built a **CPU-parallel log intelligence platform** (Python `ProcessPoolExecutor`, FastAPI, React/TypeScript) processing **100–500 MB** synthetic logs on a 12-logical-processor i5-1235U workstation.
- Designed **workload decomposition** with newline-aligned byte chunks, an associative **partial-result / evidence contract**, and verified **sequential ≡ parallel** via pytest.
- Separated a CLI-runnable **HPC engine** from the product layer via **`LocalProcessBackend.execute(job_spec)`** (JWT + SQLite reproducibility fields).
- Measured **speedup/efficiency/strong scaling** for workers 1–12: on 100 MB, \(S_8 \approx 1.95\) (\(E_8 \approx 0.24\)); on 500 MB, \(S_{12} \approx 2.53\) (\(E_{12} \approx 0.21\)); classified the workload **CPU-bound** (I/O vs parse profiles).
- Integrated **local Ollama (`llama3.2:3b`)** for evidence/aggregate-only incident summaries with a graceful down fallback — no GPU/cloud API.
- Delivered GitHub Issues/Projects, PR workflow, and CI (pytest + frontend production build).

## LinkedIn / GitHub about

> Parallel Log Intelligence Platform — HPC-style offline log analytics with process-level parallelism, benchmarking (speedup/efficiency/strong scaling on 100–500 MB), FastAPI + React UI, and local LLM explanations. Built for multi-core CPUs without CUDA.

## ATS keywords

`High Performance Computing`, `Parallel Computing`, `Multiprocessing`, `Workload Decomposition`, `Performance Benchmarking`, `FastAPI`, `React`, `TypeScript`, `SQLAlchemy`, `Log Analysis`, `Security Analytics`, `GitHub Actions`, `WSL2`
