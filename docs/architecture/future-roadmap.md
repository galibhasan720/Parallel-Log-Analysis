# Future Roadmap

Stage 1 delivered the local ProcessPool prototype (v1.0.0).  
Stage 2 (this tree) adds OpenMP, single-node MPI, dynamic scheduling, directory input, and CSE 471 course alignment.

```text
Stage 1  Local Offline HPC Prototype          ← v1.0.0
Stage 2  Multi-paradigm CPU HPC (OpenMP/MPI)  ← current
Stage 3  Multi-node Distributed HPC Platform
Stage 4  Continuous / Real-Time Log Processing
Stage 5  Production Observability Platform
Stage 6  AI-Assisted Incident Intelligence
```

## Stage 2 — Performance engineering

Dynamic scheduling, chunk granularity, parser optimization, I/O profiling, adaptive chunking. Research: why does performance plateau?

## Stage 3 — Distributed HPC

Same contract: input chunk → worker → partial result → reducer. Swap `LocalProcessBackend` for `MPIBackend` or `DistributedBackend`.

## Stage 4 — Continuous processing

`FileInputSource` → `StreamInputSource` / message queue. Streaming aggregation and alerts.

## Stage 5 — Production observability

HA, roles, audit logs, multi-tenancy, retention, encryption, secrets, monitoring, backups.

## Stage 6 — AI incident intelligence

Evidence → incident correlation → AI investigation assistant (what / when / which services / likely RCA / next steps).

## Explicitly out of Stage 1

Kafka, Elasticsearch, Kubernetes, multi-node MPI, complex RBAC, multi-tenancy, deep-learning anomaly detection, real-time streaming, mobile app, cloud deployment.

## Data architecture evolution

| Stage | Storage |
| ----- | ------- |
| 1 | SQLite + local filesystem |
| 2 | PostgreSQL + local object storage |
| 3 | PostgreSQL + object storage + search index |
| 4 | Event stream + object storage + analytics + metadata DB |
