# Performance Results

**Machine:** 12th Gen Intel Core i5-1235U · 12 logical processors (2P+8E, HT) · 12 GB DDR4 · Iris Xe · NVMe · Windows 10  
**Rules:** warm-up discarded; 3 measured runs; `time.perf_counter`; same file/parser/analysis; stdlib harness only (no psutil).  
**Dataset:** `E:\datasets\log-intelligence\generated\synth_100mb.log` · 104 857 682 bytes · 901 610 lines  
**Harness:** `python backend/scripts/run_benchmarks.py` · measured 2026-08-08 UTC  
**CPU%/RAM:** not instrumented (stdlib-only). Not estimated.

Raw dump: `benchmarks/results/experiment_a_synth_100mb_summary.json`

## Experiment A — Worker count (required)

| Dataset | Size | Workers | Run1 s | Run2 s | Run3 s | Mean s | Speedup | Efficiency | Notes |
| ------- | ---- | ------- | ------ | ------ | ------ | ------ | ------- | ---------- | ----- |
| synth_100mb | 100 MB | 1 | 7.664 | 7.570 | 7.535 | 7.589 | 1.00 | 1.00 | sequential baseline \(T_1\) |
| synth_100mb | 100 MB | 2 | 5.388 | 5.821 | 5.781 | 5.663 | 1.34 | 0.67 | |
| synth_100mb | 100 MB | 4 | 4.522 | 4.513 | 4.454 | 4.497 | 1.69 | 0.42 | |
| synth_100mb | 100 MB | 6 | 4.643 | 4.204 | 4.758 | 4.535 | 1.67 | 0.28 | |
| synth_100mb | 100 MB | 8 | 4.076 | 3.761 | 3.860 | 3.899 | 1.95 | 0.24 | best mean |
| synth_100mb | 100 MB | 12 | 4.422 | 4.516 | 4.043 | 4.327 | 1.75 | 0.15 | |

Speedup \(S_p = T_1 / T_p\). Efficiency \(E_p = S_p / p\).  
Throughput at \(p=1\): 1.19×10⁵ lines/s · 13.2 MB/s. At \(p=8\): 2.31×10⁵ lines/s · 25.6 MB/s.

## Strong scaling (required)

Same 100 MB file for every worker count above (fixed problem size). Speedup is sublinear: \(S_8 \approx 1.95\), then drops at 12 workers. Best wall-clock on this laptop is 8 workers, not 12.

## I/O vs CPU note (required)

Sequential profiles on the same 100 MB file (warm-up discarded, 3 runs).

| Mode | Mean s | Observation |
| ---- | ------ | ----------- |
| Read-only | 0.048 | byte read only |
| Parse-only | 5.583 | regex parse, no histograms |
| Parse + analyze | 8.955 | full sequential engine |

**Classify: CPU-bound.** Disk read is ~0.5% of parse+analyze time. Parsing dominates; histogram updates add further CPU. Parallel workers help until process overhead and hybrid-core contention overtake the gain.

## Stretch experiments

- B: static vs dynamic scheduling — not run (Day 4 uses static chunks only)
- C: chunk granularity — not run
- D: parser optimization — not run
- E: aggregation strategy — not run
- Weak scaling: not run (Day 7)

## Discussion (Day 4 note)

The i5-1235U is a hybrid P/E U-series part: extra workers beyond ~6–8 share E-cores and SMT threads, so efficiency falling to 0.24 at 8 workers and 0.15 at 12 is expected, not a bug. Full Day-7 500 MB matrix still pending.
