# CSE 471 Course Alignment — Stage 2

**Course:** CSE 471 Introduction to High Performance Computing (Spring 2026)  
**Project:** AI-Powered Parallel Log Intelligence Platform  
**Device:** Intel i5-1235U (no NVIDIA CUDA) · laptop-only  

This document maps the official course outline to **evidence in this repository**.

## Decision: why not CUDA?

The course description emphasizes GPU/CUDA. This laptop has **Intel Iris Xe** — there is **no CUDA device**. Choosing CUDA would fail on this hardware. Objective (f) of the course asks students to evaluate suitability of HPC solutions: we evaluated GPU acceleration and selected a **CPU multi-paradigm** design (ProcessPool + OpenMP + single-node MPI) that runs here and still covers OpenMP/MPI weeks.

## CLO mapping

| CLO | Outline requirement | Evidence in this project |
| --- | ------------------- | ------------------------ |
| CLO1 | Measure, analyze, benchmark computing models | [PERFORMANCE.md](PERFORMANCE.md) worker matrices; `run_benchmarks.py --profile compare` across process/dynamic/mpi/openmp; speedup \(S_p\), efficiency \(E_p\), strong + weak scaling |
| CLO2 | UNIX shell / command line / scripts | CLI `python -m hpc_engine.analyze`; [scripts/hpc/](../scripts/hpc/) `submit_local.sh`, `run_job.sh`, `collect_results.sh`; SETUP uses WSL2 Ubuntu |
| CLO3 | Manage jobs / scheduler / transfer / modules | Local cluster-lite scripts (submit → run → collect); FastAPI job queue `queued→running→aggregating→completed`; venv as environment-module analogue; honest note: not Slurm/PBS on a university cluster |

## Week-by-week mapping

| Week | Topic | How this project covers it |
| ---- | ----- | -------------------------- |
| 1 | HPC clusters | Documented single-node HPC + cluster-lite scripts; multi-node called out as future |
| 2 | Parallel programming models | Four backends: process, dynamic, OpenMP, MPI |
| 3 | Flynn / shared vs distributed memory | Shared-memory: ProcessPool + OpenMP; distributed-memory *API*: mpi4py even on one node |
| 4 | Parallel algorithms + metrics | Byte-chunk domain decomposition, associative reduce, \(S_p\), \(E_p\) |
| 5–7 | OpenMP | `native/openmp_worker/openmp_worker.c` with `#pragma omp parallel for`; ctypes backend |
| 8–10 | MPI + domain decomposition | `mpi_engine.py` + `MPIBackend` + `mpiexec -n N` |
| 11–14 | GPU / CUDA / OpenACC | **Not implemented** — unsuitable on Iris Xe; written evaluation above |
| 15 | Review | [FACULTY_BRIEFING.md](FACULTY_BRIEFING.md) + this file |

## How to demonstrate each backend

```bash
# ProcessPool (Stage 1)
python -m hpc_engine.analyze --input data/samples/synth_small.log --backend process --mode parallel --workers 4

# Dynamic chunks
python -m hpc_engine.analyze --input data/samples/synth_small.log --backend dynamic --workers 4

# OpenMP (after: cd native/openmp_worker && make)
python -m hpc_engine.analyze --input data/samples/synth_small.log --backend openmp --workers 4

# MPI (requires MS-MPI or OpenMPI + mpi4py)
mpiexec -n 4 python -m hpc_engine.analyze --backend mpi --input data/samples/synth_small.log --workers 4
```

## Parity (correctness under parallelism)

`pytest backend/tests/test_parity.py` — sequential ≡ process ≡ dynamic; MPI/OpenMP skipped if runtime missing, run locally when available.

## Honest scope

Stage 2 is still **laptop shared-memory + single-node MPI teaching**. It does not replace a university cluster login, Slurm accounting, or CUDA labs. It maximizes what this device can run while aligning with CSE 471 parallel models and performance measurement.

**Directory input:** multi-file directories are supported on the **CLI only** (`python -m hpc_engine.analyze --input-dir …`). The web upload API remains single-file (`.log` / `.txt`, 120 MB). Do not claim browser multi-file ingest.
