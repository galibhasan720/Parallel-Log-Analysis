#!/usr/bin/env bash
# Local "cluster-lite" job submit — records a job request without Slurm.
# Usage: ./scripts/hpc/submit_local.sh --input FILE --backend process --workers 4

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
JOB_DIR="${HPC_JOB_DIR:-$ROOT/benchmarks/jobs}"
mkdir -p "$JOB_DIR"

INPUT=""
BACKEND="process"
WORKERS=4
MODE="parallel"
FORMAT="auto"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input) INPUT="$2"; shift 2 ;;
    --backend) BACKEND="$2"; shift 2 ;;
    --workers) WORKERS="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --format) FORMAT="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$INPUT" ]]; then
  echo "usage: $0 --input FILE [--backend process|dynamic|mpi|openmp] [--workers N]" >&2
  exit 2
fi

JOB_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
JOB_FILE="$JOB_DIR/${JOB_ID}.json"
cat >"$JOB_FILE" <<EOF
{
  "job_id": "$JOB_ID",
  "input": "$INPUT",
  "backend": "$BACKEND",
  "workers": $WORKERS,
  "mode": "$MODE",
  "format": "$FORMAT",
  "status": "queued",
  "submitted_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "queued $JOB_ID -> $JOB_FILE"
echo "run with: ./scripts/hpc/run_job.sh $JOB_ID"
