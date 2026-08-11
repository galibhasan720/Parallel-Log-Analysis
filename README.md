# AI-Powered Parallel Log Intelligence Platform

CPU-parallel log analytics with **multi-paradigm HPC backends** (ProcessPool, dynamic scheduling, OpenMP, single-node MPI), benchmarking (speedup / efficiency / strong & weak scaling), FastAPI + React UI, and local LLM explanations. Built for multi-core CPUs without CUDA.

**Stage 1:** local offline HPC prototype (v1.0.0).  
**Stage 2:** CSE 471 course-aligned upgrade — OpenMP + MPI + dynamic scheduling on laptop (Iris Xe; CUDA out of scope). Job API persists `schedule` / `chunks_per_worker`; benchmarks accept `execution_backend`.

## Why this project

Large log workloads are split into newline-aligned byte chunks, processed under a chosen backend, and merged through a deterministic **partial-result / evidence contract**. AI (Ollama) explains **aggregates only** — never raw multi-GB logs.

Course mapping: [docs/COURSE_ALIGNMENT.md](docs/COURSE_ALIGNMENT.md) · Faculty briefing: [docs/FACULTY_BRIEFING.md](docs/FACULTY_BRIEFING.md).

## Architecture freeze

| Boundary | Role |
| -------- | ---- |
| **System A — HPC engine** | CLI-runnable computation. Independent of React / FastAPI / SQLite / JWT / Ollama. |
| **System B — Product layer** | Orchestrates jobs via `ExecutionBackend`. Does not contain the core HPC algorithm. |

Four frozen abstractions:

1. **Canonical Log Event** — `timestamp`, `level`, `service`, `message`
2. **Analysis Job** — dataset + mode + workers + backend + versions + status
3. **Partial Result / Evidence Contract** — small mergeable JSON; never full record dumps
4. **Execution Backend** — Stage 2: `process` \| `dynamic` \| `mpi` \| `openmp`

See [docs/architecture/system.md](docs/architecture/system.md) and the full [IMPLEMENTATION_GUIDE.md](Parallel%20log%20analysis/IMPLEMENTATION_GUIDE.md).

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Dev OS | WSL2 Ubuntu 24.04 / Windows + MS-MPI |
| Language | Python 3.12 + OpenMP C worker |
| HPC | `ProcessPoolExecutor`, dynamic chunks, `mpi4py`, OpenMP (`#pragma omp`) |
| API | FastAPI + Uvicorn |
| DB | SQLite (SQLAlchemy 2) |
| Frontend | React 18 + TypeScript + Vite + Recharts |
| AI | Ollama `llama3.2:3b` / `phi3:mini` |
| Hardware | Intel i5-1235U · 12 logical processors · 12 GB RAM · Iris Xe |

**GitHub:** [galibhasan720/Parallel-Log-Analysis](https://github.com/galibhasan720/Parallel-Log-Analysis) · board [Parallel Log Intelligence](https://github.com/users/galibhasan720/projects/7) · see [docs/PROJECT_BOARD.md](docs/PROJECT_BOARD.md)

## Quickstart

```powershell
pip install -r requirements.txt
$env:PYTHONPATH = "backend"

python -m hpc_engine.analyze --input data/samples/synth_small.log --backend process --mode parallel --workers 4
python -m hpc_engine.analyze --input data/samples/synth_small.log --backend dynamic --workers 4
python -m hpc_engine.analyze --input data/samples/synth_small.log --backend openmp --workers 4
mpiexec -n 4 python -m hpc_engine.analyze --backend mpi --input data/samples/synth_small.log --workers 4

uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
cd frontend; npm install; npm run dev
```

Build OpenMP DLL (Windows MinGW): `cd native/openmp_worker; make dll` — see [docs/SETUP.md](docs/SETUP.md).

Large datasets live on `E:\datasets\log-intelligence\`, not in git.

## Non-negotiable pillars

1. **Correctness** — sequential == parallel (all backends)  
2. **Performance** — measurable speedup  
3. **Scalability** — strong scaling (+ weak scaling)  
4. **Evidence** — real benchmark data only  
5. **Modularity** — HPC engine independent from the web app  

## License

MIT. See [LICENSE](LICENSE).
