# HPC Engine (System A)

## Workload decomposition

1. Split by **byte ranges** (`T / N` workers).
2. Align each chunk start to the next newline (except chunk 0): `seek(start)` then `readline()`.
3. Process until the logical end boundary, finishing the current line.
4. Return **associative partials only** (counts, sums, min/max, histograms, finding counters).
5. Deterministic reducer merges partials.

Result: no duplicate lines, no missing lines, no partial-line corruption.

## Scheduling

| Level | Strategy | Stage 1 |
| ----- | -------- | ------- |
| 1 | Static: N equal byte chunks → N workers | **Mandatory** |
| 2 | Dynamic: many smaller chunks → workers pull next | Stretch |

## Worker output contract

Workers must **not** return all parsed records. Example:

```json
{
  "worker_id": 2,
  "records_processed": 2500000,
  "valid_records": 2499900,
  "invalid_records": 100,
  "level_counts": { "INFO": 1800000, "WARNING": 400000, "ERROR": 280000, "CRITICAL": 19900 },
  "status_counts": { "200": 1900000, "404": 300000, "500": 250000 },
  "error_patterns": { "database_timeout": 12000, "authentication_failure": 8500 },
  "service_counts": { "auth-service": 500000, "booking-service": 1000000 }
}
```

Today: `Worker → Parent`. Future: `Worker Node → Aggregator Node` with the **same contract**.

## Sequential / parallel parity (non-negotiable)

Same analysis logic. Only difference: `workers = 1` vs `workers = N`. Aggregates must match for totals, valid/invalid, errors, services, status codes, security findings, and statistics.

Prefer **processes** over threads (Python GIL).

## Parser registry

```text
File → Format Detection → ParserRegistry → Specific Parser → Canonical LogEvent
```

MVP formats: generic application log, JSONL, Apache/Nginx.

## Hardware note (i5-1235U)

Hybrid P-cores + E-cores, 12 logical processors. Benchmark workers: `1, 2, 4, 6, 8, 12`. Expect sublinear speedup after 6–8 workers.
