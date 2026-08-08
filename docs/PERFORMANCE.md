# Performance Results

**Fill with numbers measured on this laptop only.** Do not fabricate.

**Machine:** 12th Gen Intel Core i5-1235U · 12 logical processors · 12 GB DDR4 · Iris Xe · NVMe · WSL RAM cap 6 GB  
**Rules:** warm-up discarded; 3 measured runs; same file/parser/analysis/power plan; no heavy browser/Cursor during timed runs.

## Experiment A — Worker count (required)

| Dataset | Size | Workers | Run1 s | Run2 s | Run3 s | Mean s | Speedup | Efficiency | Notes |
| ------- | ---- | ------- | ------ | ------ | ------ | ------ | ------- | ---------- | ----- |
| synth_100mb | 100 MB | 1 | | | | | 1.00 | 1.00 | baseline |
| synth_100mb | 100 MB | 2 | | | | | | | |
| synth_100mb | 100 MB | 4 | | | | | | | |
| synth_100mb | 100 MB | 6 | | | | | | | |
| synth_100mb | 100 MB | 8 | | | | | | | |
| synth_100mb | 100 MB | 12 | | | | | | | |

Speedup \(S_p = T_1 / T_p\). Efficiency \(E_p = S_p / p\).

## Strong scaling (required)

Fixed dataset (100 MB or 500 MB). Same worker matrix as above.

## I/O vs CPU note (required)

| Mode | Mean s | Observation |
| ---- | ------ | ----------- |
| Read-only | | |
| Parse-only | | |
| Parse + analyze | | |

Classify: CPU-bound / I/O-bound / memory-bound.

## Stretch experiments

- B: static vs dynamic scheduling  
- C: chunk granularity (4w/4t vs 4w/16t vs 4w/64t)  
- D: parser optimization  
- E: aggregation strategy  
- Weak scaling: 1w→100 MB, 2w→200 MB, 4w→400 MB, 8w→800 MB  

## Discussion (Day 7)

- Bottlenecks  
- Hybrid P/E-core effects  
- Why efficiency drops after 6–8 workers (expected on U-series)
