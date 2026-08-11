# Performance Results

**Machine:** 12th Gen Intel Core i5-1235U · 12 logical processors (2P+8E, HT) · 12 GB DDR4 · Iris Xe · NVMe · Windows 10  
**Rules:** warm-up discarded; 3 measured runs; `time.perf_counter`; same file/parser/analysis; stdlib harness only (no psutil).  
**Harness:** `python backend/scripts/run_benchmarks.py`  
**CPU%/RAM:** not instrumented (stdlib-only). Not estimated.

| Dataset | Path | Bytes | Lines | Measured |
| ------- | ---- | ----- | ----- | -------- |
| synth_100mb | `E:\datasets\log-intelligence\generated\synth_100mb.log` | 104 857 682 | 901 610 | 2026-08-08 UTC |
| synth_500mb | `E:\datasets\log-intelligence\generated\synth_500mb.log` | 524 288 079 | 4 508 066 | 2026-08-09 UTC |

Summaries: `benchmarks/results/experiment_a_synth_100mb_summary.json`, `benchmarks/results/experiment_a_synth_500mb_summary.json`

## Experiment A — Worker count (required)

### synth_100mb (Day 4)

| Dataset | Size | Workers | Run1 s | Run2 s | Run3 s | Mean s | Speedup | Efficiency | Notes |
| ------- | ---- | ------- | ------ | ------ | ------ | ------ | ------- | ---------- | ----- |
| synth_100mb | 100 MB | 1 | 7.664 | 7.570 | 7.535 | 7.589 | 1.00 | 1.00 | sequential baseline \(T_1\) |
| synth_100mb | 100 MB | 2 | 5.388 | 5.821 | 5.781 | 5.663 | 1.34 | 0.67 | |
| synth_100mb | 100 MB | 4 | 4.522 | 4.513 | 4.454 | 4.497 | 1.69 | 0.42 | |
| synth_100mb | 100 MB | 6 | 4.643 | 4.204 | 4.758 | 4.535 | 1.67 | 0.28 | |
| synth_100mb | 100 MB | 8 | 4.076 | 3.761 | 3.860 | 3.899 | 1.95 | 0.24 | best mean |
| synth_100mb | 100 MB | 12 | 4.422 | 4.516 | 4.043 | 4.327 | 1.75 | 0.15 | |

Throughput at \(p=1\): 1.19×10⁵ lines/s · 13.2 MB/s. At \(p=8\): 2.31×10⁵ lines/s · 25.6 MB/s.

### synth_500mb (Day 7)

| Dataset | Size | Workers | Run1 s | Run2 s | Run3 s | Mean s | Speedup | Efficiency | Notes |
| ------- | ---- | ------- | ------ | ------ | ------ | ------ | ------- | ---------- | ----- |
| synth_500mb | 500 MB | 1 | 42.073 | 45.822 | 43.300 | 43.732 | 1.00 | 1.00 | sequential baseline \(T_1\) |
| synth_500mb | 500 MB | 2 | 34.187 | 32.971 | 34.047 | 33.735 | 1.30 | 0.65 | |
| synth_500mb | 500 MB | 4 | 23.990 | 24.377 | 24.874 | 24.414 | 1.79 | 0.45 | |
| synth_500mb | 500 MB | 6 | 20.762 | 20.107 | 20.495 | 20.455 | 2.14 | 0.36 | |
| synth_500mb | 500 MB | 8 | 17.926 | 17.827 | 18.088 | 17.947 | 2.44 | 0.30 | |
| synth_500mb | 500 MB | 12 | 18.403 | 16.709 | 16.748 | 17.287 | 2.53 | 0.21 | best mean |

Throughput at \(p=1\): 1.03×10⁵ lines/s · 11.4 MB/s. At \(p=12\): 2.61×10⁵ lines/s · 28.9 MB/s.

Speedup \(S_p = T_1 / T_p\). Efficiency \(E_p = S_p / p\).

## Strong scaling (required)

Fixed problem size; increase \(p\).

- **100 MB:** sublinear; best wall-clock at **8 workers** (\(S_8 \approx 1.95\)), then \(S_{12} \approx 1.75\).
- **500 MB:** still sublinear, but spawn/overhead is amortized; best wall-clock at **12 workers** (\(S_{12} \approx 2.53\)). Efficiency still falls to 0.21 at \(p=12\).

Larger parse-bound work hides ProcessPool startup better than the 100 MB case.

## I/O vs CPU note (required)

Sequential profiles on **synth_100mb** (warm-up discarded, 3 runs, Day 4).

| Mode | Mean s | Observation |
| ---- | ------ | ----------- |
| Read-only | 0.048 | byte read only |
| Parse-only | 5.583 | regex parse, no histograms |
| Parse + analyze | 8.955 | full sequential engine |

**Classify: CPU-bound.** Disk read is ~0.5% of parse+analyze. Parsing dominates; histogram updates add CPU. The 500 MB matrix is consistent with that story (sequential ~5.8× the 100 MB \(T_1\), close to the 5× size ratio).

## Stretch experiments

- B: static vs dynamic scheduling — **run** (Stage 2; see backend compare on synth_10mb)
- C: chunk granularity — not run as a separate matrix (dynamic uses `chunks_per_worker=8`)
- D: parser optimization — not run
- E: aggregation strategy — not run
- Weak scaling — **run** (Stage 2): ~50 MB work per worker

## Stage 2 — Weak scaling (process backend)

**Rule:** ~50 MB per worker · warm-up + 2 timed runs · 2026-08-10 UTC  
Ideal weak scaling keeps wall-clock ≈ \(T_1\) as both problem size and \(p\) grow. Efficiency here is reported as \(T_1 / T_p\) (same wall-clock ⇒ efficiency 1).

| Workers \(p\) | File | Mean s | \(T_1/T_p\) |
| ------------- | ---- | ------ | ----------- |
| 1 | synth_50mb | 4.552 | 1.00 |
| 2 | synth_100mb | 17.121 | 0.27 |
| 4 | synth_200mb | 20.028 | 0.23 |

Interpretation: wall-clock rises with size; ProcessPool spawn + hybrid P/E keep weak efficiency low on this laptop. Still a valid measured weak-scaling experiment for the report.

## Stage 2 — Backend comparison (synth_10mb)

**Measured:** 2026-08-10 UTC · i5-1235U · 2 timed runs after warm-up · file `synth_10mb.log` (10 485 804 bytes).  
**Summary JSON:** `benchmarks/results/backend_compare_synth_10mb_20260810T213535Z.json`

| Backend | p=1 mean s | Best p | Best mean s | Best \(S_p\) | Best \(E_p\) |
| ------- | ---------- | ------ | ----------- | ------------ | ------------ |
| process (static ProcessPool) | 0.876 | 4 | 0.665 | 1.32 | 0.33 |
| dynamic (many chunks) | 1.076 | 4 | 0.921 | 1.17 | 0.29 |
| openmp (native `#pragma omp`) | 1.186 | 8 | 0.516 | 2.30 | 0.29 |
| mpi (mpi4py + MS-MPI, single node) | 2.359 | 4 | 1.445 | 1.63 | 0.41 |

Notes:

- **10 MB is small** for ProcessPool (spawn overhead dominates at p=8). Prefer 100 MB tables above for process scaling claims.
- **OpenMP** shows the best wall-clock on this small file (shared-memory threads, no process spawn).
- **MPI** pays launch/`mpiexec` overhead on Windows; still demonstrates distributed-memory programming with correct aggregates.
- Parity: sequential ≡ process ≡ dynamic ≡ openmp ≡ mpi on `synth_small.log` (`pytest`).

### Experiment B detail (process static vs dynamic, synth_10mb)

| Workers | Static mean s | Dynamic mean s |
| ------- | ------------- | -------------- |
| 1 | 0.876 | 1.076 |
| 2 | 0.818 | 1.095 |
| 4 | 0.665 | 0.921 |
| 8 | 0.966 | 1.043 |

On this size, static wins; dynamic is for load-imbalance teaching and larger/irregular files.

## Discussion

Bottleneck is **CPU parse + histogram updates**, not NVMe read. The i5-1235U is a hybrid P/E U-series part (2P+8E, 12 threads): extra workers beyond ~6–8 share E-cores and SMT, so efficiency dropping toward 0.24–0.30 at 8 workers and ~0.15–0.21 at 12 is expected. On 100 MB, \(p=12\) lost to \(p=8\) (overhead > remaining work). On 500 MB, \(p=12\) still wins on mean wall-clock but with low efficiency. Peak RSS was not collected (no psutil); 12 GB RAM was enough to hold a 500 MB mapped file plus a small worker tree without swapping observed in the timed session.

Stage 2 adds **multi-paradigm** evidence for CSE 471 (OpenMP weeks 5–7, MPI weeks 8–10) without CUDA (Iris Xe).
