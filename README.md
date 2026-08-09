# AI-Powered Parallel Log Intelligence Platform

CPU-parallel log analytics with process-level parallelism, benchmarking (speedup / efficiency / strong scaling), FastAPI + React UI, and local LLM explanations. Built for multi-core CPUs without CUDA.

**Stage 1:** local offline HPC prototype (~20–25% of the long-term vision).

## Why this project

Large log workloads are split into newline-aligned byte chunks, processed with `ProcessPoolExecutor`, and merged through a deterministic **partial-result / evidence contract**. AI (Ollama) explains **aggregates only** — never raw multi-GB logs.

## Architecture freeze (Day 1)

| Boundary | Role |
| -------- | ---- |
| **System A — HPC engine** | CLI-runnable computation. Independent of React / FastAPI / SQLite / JWT / Ollama. |
| **System B — Product layer** | Orchestrates jobs via `ExecutionBackend`. Does not contain the core HPC algorithm. |

Four frozen abstractions:

1. **Canonical Log Event** — `timestamp`, `level`, `service`, `message`
2. **Analysis Job** — dataset + mode + workers + backend + versions + status
3. **Partial Result / Evidence Contract** — small mergeable JSON; never full record dumps
4. **Execution Backend** — Stage 1: `LocalProcessBackend.execute(job_spec)`

See [docs/architecture/system.md](docs/architecture/system.md) and the full [IMPLEMENTATION_GUIDE.md](Parallel%20log%20analysis/IMPLEMENTATION_GUIDE.md).

## Tech stack (locked)

| Layer | Choice |
| ----- | ------ |
| Dev OS | WSL2 Ubuntu 24.04 |
| Language | Python 3.12 |
| HPC | `ProcessPoolExecutor` + chunked I/O |
| API | FastAPI + Uvicorn |
| DB | SQLite (SQLAlchemy 2) |
| Frontend | React 18 + TypeScript + Vite + Recharts |
| AI | Ollama `llama3.2:3b` / `phi3:mini` |
| Hardware | Intel i5-1235U · 12 logical processors · 12 GB RAM · Iris Xe |

**GitHub:** [galibhasan720/Parallel-Log-Analysis](https://github.com/galibhasan720/Parallel-Log-Analysis) · board [Parallel Log Intelligence](https://github.com/users/galibhasan720/projects/7) · issues #1–#19 · see [docs/PROJECT_BOARD.md](docs/PROJECT_BOARD.md)

## Quickstart (after Day 2+)

```bash
# WSL Ubuntu 24.04
cd /mnt/e/Galib/IUB/IUB-Semester\ 9/Parallel\ Programming/Project/Parallel\ Log\ Analysis
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# HPC engine (System A) — independent of the web stack
python -m hpc_engine.analyze --input data/samples/synth_small.log --workers 4 --mode parallel

# Product layer (System B, Day 5+)
uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000

# React UI (Day 6+) — second terminal
cd frontend && npm install && npm run dev
# http://127.0.0.1:5173  (proxies /api → :8000)
```

Large datasets live on `E:\datasets\log-intelligence\`, not in git.

## 7-day roadmap

| Day | Theme |
| --- | ----- |
| 1 | Foundation (this commit) |
| 2 | Sequential baseline |
| 3 | Parallel HPC core + seq ≡ parallel |
| 4 | Benchmark + analytics |
| 5 | FastAPI + SQLite + LocalProcessBackend |
| 6 | React + aggregate-only AI |
| 7 | Evidence, PERFORMANCE.md, release |

## Non-negotiable pillars

1. **Correctness** — sequential == parallel  
2. **Performance** — measurable speedup  
3. **Scalability** — strong scaling (+ weak scaling note)  
4. **Evidence** — real benchmark data only  
5. **Modularity** — HPC engine independent from the web app  

## License

MIT. See [LICENSE](LICENSE).
