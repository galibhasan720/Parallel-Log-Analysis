# Setup (WSL2 + toolchain)

Follow this before Day 2 coding. Full command copy lives in [IMPLEMENTATION_GUIDE.md](../Parallel%20log%20analysis/IMPLEMENTATION_GUIDE.md) Section 8.

## Hardware hygiene

| Resource | This machine | Rule |
| -------- | ------------ | ---- |
| RAM | 12 GB | Close Chrome / unused Electron apps during benchmarks |
| CPU | i5-1235U | AC power + Windows Best Performance for timed runs |
| GPU | Iris Xe | No CUDA; Ollama uses CPU |
| Disk | NVMe; `E:` freer | Project + datasets on `E:` |
| Virt | Enabled | Required for WSL2 |

`%UserProfile%\.wslconfig` (created Day 1):

```ini
[wsl2]
memory=6GB
processors=8
swap=4GB
```

Then: `wsl --shutdown` and reopen Ubuntu.

## Install order

1. WSL2 + Ubuntu 24.04: `wsl --install -d Ubuntu-24.04`
2. Inside Ubuntu: `sudo apt update && sudo apt upgrade -y && sudo apt install -y build-essential git curl wget unzip ca-certificates`
3. GitHub CLI: `sudo apt install -y gh` then `gh auth login` (Windows `gh` is already authenticated as `galibhasan720`)
4. Python 3.12 + venv on `/mnt/e/...`
5. Node 20 LTS via nvm (host currently has Node v24 — use nvm `20` inside WSL for the frontend)
6. Ollama: install on Windows **or** WSL (pick one host). Pull `llama3.2:3b` (fallback `phi3:mini`)

Day 5+ Python deps (FastAPI / SQLAlchemy / PyJWT) are in `requirements.txt`. Day 6 React deps: `cd frontend && npm install`.

## Dataset path

Large logs: `E:\datasets\log-intelligence\`  
Tiny git samples: `data/samples/`

## Verification checklist (Section 8.8) — Day 1 status

- [x] `wsl -l -v` shows **Ubuntu-24.04**, VERSION 2 (Stopped until first launch). Default is still `docker-desktop` — set Ubuntu as default after first login.
- [x] Python 3.12.10 — `py -3.12` / `%LocalAppData%\Programs\Python\Python312\python.exe`. Project `.venv` created with 3.12.10.
- [x] `node -v` → **v20.20.2** (nvm inside Ubuntu). Windows host still has Node 24 — leave that alone.
- [x] `gh auth status` OK — `galibhasan720` with `project` scope. Board: [projects/7](https://github.com/users/galibhasan720/projects/7).
- [x] `ollama list` shows **`llama3.2:3b`** (2.0 GB) — Ollama 0.32.1 at `%LocalAppData%\Programs\Ollama\ollama.exe`.
- [x] Project folder reachable from WSL under `/mnt/e/...` (Ubuntu user `galib56`).
- [x] At least 15–20 GB free on `E:` — Day 1 measured **≈ 49 GB free**.
- [x] `%UserProfile%\.wslconfig` written (`memory=6GB`, `processors=8`, `swap=4GB`).

## Remaining manual steps

```powershell
# First launch (creates Linux username/password — interactive)
wsl -d Ubuntu-24.04
wsl --set-default Ubuntu-24.04
wsl --shutdown

# After OllamaSetup.exe finishes (Start Menu → Ollama)
$env:Path += ";$env:LOCALAPPDATA\Programs\Ollama;$env:ProgramFiles\Ollama"
ollama pull llama3.2:3b
ollama run llama3.2:3b "Summarize: 1200 ERROR lines, top IP 203.0.113.5 with 400 failed logins."

# GitHub Project board (interactive browser login)
gh auth refresh -s read:project -s project
# then follow docs/PROJECT_BOARD.md
```

```bash
# Inside Ubuntu 24.04
cd "/mnt/e/Galib/IUB/IUB-Semester 9/Parallel Programming/Project/Parallel Log Analysis"
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential git curl wget unzip ca-certificates python3.12 python3.12-venv
# use the Windows .venv or create a WSL venv — prefer WSL venv for Day 2+ HPC
python3.12 -m venv .venv-wsl
source .venv-wsl/bin/activate
python --version   # 3.12.x

# Node 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# restart shell
nvm install 20
node -v
```

Windows `.venv` (3.12.10) is already at the repo root for local scripts. Prefer a **WSL venv** for Day 2+ multiprocessing so behavior matches Linux servers.

## Day 5 — API (System B)

HPC CLI (System A) does not need FastAPI. The product layer does:

```powershell
# repo root, Python 3.12 venv
pip install -r requirements.txt
$env:PYTHONPATH = "backend"
$env:JWT_SECRET = "set-a-real-secret-before-demo"
python backend/scripts/reset_db.py
uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
```

- Docs: http://127.0.0.1:8000/docs  
- DB file: `backend/data/app.db` (gitignored)  
- Uploads: `backend/data/uploads/` (gitignored; jobs use dataset IDs, never client paths)  
- Dev default `JWT_SECRET` is `dev-only-change-me` — override via env.

Manual DoD: register → login → upload `synth_10mb.log` → `POST /api/jobs` → poll → `GET /api/jobs/{id}/results`. Then confirm CLI still works:

```powershell
$env:PYTHONPATH = "backend"
python -m hpc_engine.analyze --input data/samples/synth_small.log --mode sequential
```

## Day 6 — React UI + Ollama

Keep uvicorn running, then in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

UI: http://127.0.0.1:5173 (Vite proxies `/api` → `http://127.0.0.1:8000`).

Ollama (already pulled Day 1): `llama3.2:3b` on `http://127.0.0.1:11434`. Override with `OLLAMA_HOST` / `OLLAMA_MODEL`. If Ollama is down, **Generate AI Report** returns 503 and the UI shows a fallback — the API does not crash.

**Benchmark hygiene:** stop Vite + Ollama during official HPC timed runs (`run_benchmarks.py`).

## Stage 2 — Multi-paradigm backends (CSE 471)

| Backend | Runtime | Build / install |
| ------- | ------- | --------------- |
| `process` | Python `ProcessPoolExecutor` | Default (always) |
| `dynamic` | ProcessPool + many small chunks | Default |
| `mpi` | `mpi4py` + `mpiexec` | Windows: Microsoft MPI + `pip install mpi4py`. WSL: `sudo apt install openmpi-bin libopenmpi-dev` then `pip install mpi4py` |
| `openmp` | Native C + OpenMP | `cd native/openmp_worker && make` (Linux/WSL) or `make dll` (MinGW on Windows). Set `OPENMP_WORKER_LIB` if needed. |

CLI examples:

```powershell
$env:PYTHONPATH = "backend"
python -m hpc_engine.analyze --input data/samples/synth_small.log --backend process --mode parallel --workers 4
python -m hpc_engine.analyze --input data/samples/synth_small.log --backend dynamic --workers 4
python -m hpc_engine.analyze --input data/samples/synth_small.log --backend openmp --workers 4
mpiexec -n 4 python -m hpc_engine.analyze --backend mpi --input data/samples/synth_small.log --workers 4
```

Cluster-lite (bash / WSL):

```bash
chmod +x scripts/hpc/*.sh
./scripts/hpc/submit_local.sh --input data/samples/synth_small.log --backend process --workers 4
./scripts/hpc/run_job.sh <JOB_ID>
./scripts/hpc/collect_results.sh
```

Course mapping: [docs/COURSE_ALIGNMENT.md](COURSE_ALIGNMENT.md). CUDA is intentionally out of scope on Iris Xe.

### Job knobs (API + runner)

`POST /api/jobs` and `POST /api/benchmarks` accept `execution_backend`, optional `schedule` (`static`|`dynamic`), and `chunks_per_worker` (1–64). Values persist on `log_jobs` and are passed into `ExecutionBackend.execute`. After schema changes, recreate the DB if needed:

```powershell
python backend/scripts/reset_db.py
```

### Directory input (CLI only)

```powershell
python -m hpc_engine.analyze --input-dir E:\datasets\log-intelligence\batch --backend process --workers 4
```

Web upload stays single-file. Directory merge is for HPC CLI demos and tests (`test_directory.py`).

Benchmark compare:

```powershell
python backend/scripts/run_benchmarks.py --file E:\datasets\log-intelligence\generated\synth_100mb.log --profile compare --backends process,dynamic --workers 1,2,4,8 --runs 3
```

Weak scaling files:

```powershell
python backend/scripts/generate_synthetic_logs.py --weak-scaling
```


Do **not** commit `app.db` or large logs. Copy locally:

```powershell
New-Item -ItemType Directory -Force E:\backups | Out-Null
if (Test-Path backend\data\app.db) {
  Copy-Item backend\data\app.db E:\backups\app.db -Force
}
if (Test-Path E:\datasets\log-intelligence\generated\MANIFEST.txt) {
  Copy-Item E:\datasets\log-intelligence\generated\MANIFEST.txt E:\backups\MANIFEST.txt -Force
}
```

500 MB file (not in git): `E:\datasets\log-intelligence\generated\synth_500mb.log` — generate with `python backend/scripts/generate_synthetic_logs.py --also-500mb` if missing.
