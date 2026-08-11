#!/usr/bin/env bash
# Collect completed local HPC job results (cluster-lite).
# Usage: ./scripts/hpc/collect_results.sh [JOB_ID]

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
JOB_DIR="${HPC_JOB_DIR:-$ROOT/benchmarks/jobs}"

if [[ $# -ge 1 ]]; then
  JOB_FILE="$JOB_DIR/${1}.json"
  if [[ ! -f "$JOB_FILE" ]]; then
    echo "missing $JOB_FILE" >&2
    exit 2
  fi
  python3 -c "import json,pprint; pprint.pp(json.load(open(r'$JOB_FILE')))"
  exit 0
fi

echo "=== queued / completed jobs in $JOB_DIR ==="
for f in "$JOB_DIR"/*.json; do
  [[ -e "$f" ]] || continue
  python3 -c "import json; j=json.load(open(r'$f')); print(j.get('job_id'), j.get('status'), j.get('backend'), j.get('result',''))"
done
