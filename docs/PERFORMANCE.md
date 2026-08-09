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

- B: static vs dynamic scheduling — not run (Stage 1 uses static chunks)
- C: chunk granularity — not run
- D: parser optimization — not run
- E: aggregation strategy — not run
- Weak scaling (1w→100 MB, 2w→200 MB, …) — **not run** (no 200/400/800 MB files generated)

## Discussion

Bottleneck is **CPU parse + histogram updates**, not NVMe read. The i5-1235U is a hybrid P/E U-series part (2P+8E, 12 threads): extra workers beyond ~6–8 share E-cores and SMT, so efficiency dropping toward 0.24–0.30 at 8 workers and ~0.15–0.21 at 12 is expected. On 100 MB, \(p=12\) lost to \(p=8\) (overhead > remaining work). On 500 MB, \(p=12\) still wins on mean wall-clock but with low efficiency. Peak RSS was not collected (no psutil); 12 GB RAM was enough to hold a 500 MB mapped file plus a small worker tree without swapping observed in the timed session.
