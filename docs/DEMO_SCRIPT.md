# Demo Script (≤ 5 minutes)

_Screenshots: capture into `docs/images/` during a live dry-run. Do not invent images._

Talking points from **measured** i5-1235U runs (`docs/PERFORMANCE.md`).

1. **Problem (20 s)** — Multi-hundred-MB logs; sequential 500 MB takes **~44 s** on this laptop; HPC is the primary engine.
2. **Architecture (40 s)** — System A CLI vs System B product layer; four abstractions (LogEvent, Job, partial/evidence, ExecutionBackend).
3. **Upload + run (60 s)** — New Analysis: file, format, workers, Run. Show job `queued → running → aggregating → completed`.
4. **Results (60 s)** — Totals, errors, top services, security findings (evidence, not “definitely an attack”).
5. **Benchmark chart (60 s)** — 100 MB: \(S_8 \approx 1.95\), \(E_8 \approx 0.24\); 500 MB: \(S_{12} \approx 2.53\), \(E_{12} \approx 0.21\). Sublinear on hybrid P/E. Classify **CPU-bound** (read-only 0.05 s vs parse+analyze 9 s on 100 MB).
6. **AI report (40 s)** — Generate from aggregates only. Show Ollama-down fallback if useful.
7. **Correctness (20 s)** — Sequential ≡ parallel (`pytest`). CLI: `python -m hpc_engine.analyze` without FastAPI.
8. **Close (20 s)** — GitHub Issues/Projects + PERFORMANCE.md honesty (no fabricated times).
