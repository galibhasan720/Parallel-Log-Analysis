#!/usr/bin/env bash
# Execute a queued local HPC job (cluster-lite stand-in for a batch scheduler).
# Usage: ./scripts/hpc/run_job.sh JOB_ID

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
JOB_DIR="${HPC_JOB_DIR:-$ROOT/benchmarks/jobs}"
OUT_DIR="${HPC_OUT_DIR:-$ROOT/benchmarks/results}"
JOB_ID="${1:-}"

if [[ -z "$JOB_ID" ]]; then
  echo "usage: $0 JOB_ID" >&2
  exit 2
fi

JOB_FILE="$JOB_DIR/${JOB_ID}.json"
if [[ ! -f "$JOB_FILE" ]]; then
  echo "job not found: $JOB_FILE" >&2
  exit 2
fi

mkdir -p "$OUT_DIR"
cd "$ROOT"
export PYTHONPATH="${PYTHONPATH:-}:$ROOT/backend"

INPUT=$(python3 -c "import json; print(json.load(open('$JOB_FILE'))['input'])")
BACKEND=$(python3 -c "import json; print(json.load(open('$JOB_FILE'))['backend'])")
WORKERS=$(python3 -c "import json; print(json.load(open('$JOB_FILE'))['workers'])")
MODE=$(python3 -c "import json; print(json.load(open('$JOB_FILE')).get('mode','parallel'))")
FORMAT=$(python3 -c "import json; print(json.load(open('$JOB_FILE')).get('format','auto'))")

RESULT="$OUT_DIR/${JOB_ID}.result.json"
echo "running $JOB_ID backend=$BACKEND workers=$WORKERS"

if [[ "$BACKEND" == "mpi" ]]; then
  MPIEXEC="${MPIEXEC:-mpiexec}"
  command -v "$MPIEXEC" >/dev/null 2>&1 || MPIEXEC=mpirun
  "$MPIEXEC" -n "$WORKERS" python3 -m hpc_engine.analyze \
    --backend mpi --input "$INPUT" --workers "$WORKERS" --format "$FORMAT" \
    >"$RESULT"
else
  python3 -m hpc_engine.analyze \
    --backend "$BACKEND" --input "$INPUT" --workers "$WORKERS" \
    --mode "$MODE" --format "$FORMAT" \
    >"$RESULT"
fi

python3 - <<PY
import json
from pathlib import Path
job = json.loads(Path(r"$JOB_FILE").read_text())
job["status"] = "completed"
job["result"] = r"$RESULT"
Path(r"$JOB_FILE").write_text(json.dumps(job, indent=2))
print("completed", job["job_id"], "->", job["result"])
PY
