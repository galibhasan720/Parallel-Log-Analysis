# Demo Script (≤ 5 minutes)

_Screenshots: capture into `docs/images/` during a live dry-run. Do not invent images._

Talking points from **measured** i5-1235U runs (`docs/PERFORMANCE.md`). Stage 2: ProcessPool + dynamic + OpenMP + single-node MPI.

1. **Problem (20 s)** — Multi-hundred-MB logs; sequential 500 MB takes **~44 s** on this laptop; HPC is the primary engine; CUDA out of scope on Iris Xe.
2. **Architecture (35 s)** — System A CLI vs System B product layer; four backends behind `ExecutionBackend` (`process` / `dynamic` / `openmp` / `mpi`).
3. **Upload + run (55 s)** — New Analysis: file, choose backend (e.g. ProcessPool or OpenMP), workers, Run. Show job `queued → running → aggregating → completed`. Mention `chunks_per_worker` for dynamic.
4. **Results (45 s)** — Totals, errors, top services, security findings (evidence, not “definitely an attack”).
5. **Performance + backends (55 s)** — 100 MB: \(S_8 \approx 1.95\); 500 MB: \(S_{12} \approx 2.53\); OpenMP often wins on small files (10 MB compare). Weak scaling documented (honest drop). CPU-bound I/O note.
6. **CLI beat (25 s)** — One of: `python -m hpc_engine.analyze --backend openmp …` or `mpiexec -n 4 … --backend mpi …` without FastAPI. Optional: `--input-dir` for directory merge (CLI only).
7. **AI + correctness (25 s)** — Ollama aggregates-only or 503 fallback; sequential ≡ parallel (`pytest`).
8. **Close (20 s)** — GitHub + PERFORMANCE.md honesty; no fabricated times; cluster MPI / CUDA called out as future / unsuitable.

**Prep:** datasets ready, OpenMP DLL or MPI launcher probed via System Health, JWT secret overridden for demo accounts.
