# AI-Powered Parallel Log Intelligence Platform

CPU-parallel log analytics for large offline files: split the work across cores, merge one correct report, and optionally explain **aggregates** with a local LLM. Built for **CSE 471 (HPC)** on ordinary multi-core PCs. **No CUDA / no GPU required.**

**Stage 1** — local ProcessPool prototype (`v1.0.0`).  
**Stage 2** — course-aligned backends: ProcessPool, dynamic scheduling, OpenMP, single-node MPI.

**Repository:** [galibhasan720/Parallel-Log-Analysis](https://github.com/galibhasan720/Parallel-Log-Analysis)

> **Faculty:** you can run the full product (API + React UI) and the HPC CLI on **any Windows 10/11 PC**. You do **not** need this author’s `E:` drive, WSL, a GPU, or the 100/500 MB benchmark files. Full steps: [Faculty: run on any Windows PC](#faculty-run-on-any-windows-pc).

### What they need

| Need | Details |
| ---- | ------- |
| OS | Windows 10 or 11 (PowerShell). macOS/Linux also works — see the short section below. |
| Git | [git-scm.com](https://git-scm.com) |
| Python | **3.12.x** from [python.org](https://www.python.org/downloads/) — tick **Add python.exe to PATH** |
| Node.js | **20 LTS** from [nodejs.org](https://nodejs.org) |
| Time | Two terminals; about 10–15 minutes if Python and Node are already installed |
| **Not needed** | GPU / CUDA, WSL, Microsoft MPI, Ollama, this author’s `E:` datasets, 100/500 MB log files |

### Happy path (minimum demo)

1. Clone this repo → create a Python **3.12** venv → `pip install -r requirements.txt` (if `mpi4py` fails, skip that line and continue).  
2. **Terminal 1** (repo root, venv on): `$env:PYTHONPATH = "backend"` → `python backend\scripts\reset_db.py` → `uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000`  
3. **Terminal 2:** `cd frontend` → `npm install` → `npm run dev`  
4. Open **http://127.0.0.1:5173** → **Register** (then Login). The printed `demo@example.com` account does **not** exist until you register.  
5. Upload [`data/samples/synth_small.log`](data/samples/synth_small.log) → New Analysis → backend **process** → **2–4** workers → Run.  
6. Wait for `queued → running → aggregating → completed` and open results.

Copy-paste commands for each step are in [Faculty: run on any Windows PC](#faculty-run-on-any-windows-pc).

---

## What this project does

Modern systems write **logs** (logins, errors, slow requests, suspicious activity). A single file can be hundreds of megabytes. Reading it on one CPU core wastes the rest of the machine and delays investigation.

This platform:

1. Splits a log into **newline-aligned** byte chunks  
2. Analyzes chunks in **parallel** (chosen execution backend)  
3. Merges **partial results** into one global report (counts, errors, services, evidence findings)  
4. Optionally asks **Ollama** to explain that report in plain language — **never** the raw multi-hundred-MB file  

If Ollama is not installed, analytics still work; AI endpoints return 503.

---

## Architecture

| Boundary | Role |
| -------- | ---- |
| **System A — HPC engine** | Computation. Runs from the CLI with **no** React, FastAPI, SQLite, JWT, or Ollama. |
| **System B — Product** | Auth, upload, jobs, dashboards. Calls `ExecutionBackend`. Does **not** contain the core parallel algorithm. |

**Abstractions:** Canonical Log Event · Analysis Job · Partial Result / Evidence Contract · Execution Backend (`process` \| `dynamic` \| `openmp` \| `mpi`).

Details: [docs/architecture/system.md](docs/architecture/system.md).

---

## Measured highlights

Timed on a **12th Gen Intel i5-1235U** (12 logical processors, 12 GB RAM, Iris Xe). Warm-up discarded. Full tables: [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

| Dataset | Sequential | Best parallel | Speedup |
| ------- | ---------- | ------------- | ------- |
| 100 MB | ~7.6 s | ~3.9 s at **8** workers | **S₈ ≈ 1.95×** |
| 500 MB | ~44 s | ~17.3 s at **12** workers | **S₁₂ ≈ 2.53×** |

The workload is **CPU-bound** (100 MB read-only ≈ 0.05 s). Speedup is **sublinear** on hybrid P/E cores — published on purpose. This is **not** a Splunk/Elastic replacement.

---

## Faculty: run on any Windows PC

Minimum demo: **ProcessPool** backend + sample log in git. Typical time: 10–15 minutes if Python 3.12 and Node 20 are already installed.

### 0. Prerequisites

| Tool | Version | Notes |
| ---- | ------- | ----- |
| Windows | 10 or 11 | PowerShell |
| Git | any recent | [git-scm.com](https://git-scm.com) |
| Python | **3.12.x** | [python.org](https://www.python.org/downloads/) — tick **Add python.exe to PATH** |
| Node.js | **20 LTS** | [nodejs.org](https://nodejs.org) (LTS, not odd-numbered current) |

Check:

```powershell
py -3.12 --version
node -v
npm -v
```

You need **two** PowerShell windows.

### 1. Clone and virtual environment

```powershell
git clone https://github.com/galibhasan720/Parallel-Log-Analysis.git
cd Parallel-Log-Analysis

py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

**If `mpi4py` fails** (common when Microsoft MPI is not installed): the UI and `process` / `dynamic` backends still work. Comment out the `mpi4py` line in `requirements.txt` and run `pip install -r requirements.txt` again. MPI is optional for the faculty demo.

If PowerShell blocks the venv script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 2. Database + API (Terminal 1)

Stay in the **repo root**, venv **activated**:

```powershell
$env:PYTHONPATH = "backend"
$env:JWT_SECRET = "faculty-local-secret"
python backend\scripts\reset_db.py
uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
```

Leave this window open. API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

`PYTHONPATH` must be set **in this terminal** every new session.

### 3. React UI (Terminal 2)

```powershell
cd Parallel-Log-Analysis\frontend
npm install
npm run dev
```

UI: **[http://127.0.0.1:5173](http://127.0.0.1:5173)**  
Vite proxies `/api` to port **8000**. Keep both servers running.

### 4. First login (required)

The login form may show `demo@example.com` / `password12`. **Those accounts do not exist until you register.**

1. Open the UI → **Register**  
2. Use any email + password (min length enforced by the form)  
3. Switch to **Login** with the same credentials  

SQLite is created locally at `backend/data/app.db` (gitignored).

### 5. Run one analysis

1. **New Analysis** (or Datasets / upload)  
2. Upload [`data/samples/synth_small.log`](data/samples/synth_small.log) from the repo  
3. Backend: **process** · workers: **2** or **4**  
4. Run → wait for `queued → running → aggregating → completed`  
5. Open results (totals, errors, services, findings)

That is enough to grade the product path. Large 100/500 MB files are **not** in git; they were used only for published benchmarks.

---

## HPC engine only (no website)

Repo root, venv on, `PYTHONPATH` set:

```powershell
$env:PYTHONPATH = "backend"
python -m hpc_engine.analyze --input data\samples\synth_small.log --backend process --mode parallel --workers 4
```

Other backends (when installed):

```powershell
python -m hpc_engine.analyze --input data\samples\synth_small.log --backend dynamic --workers 4
python -m hpc_engine.analyze --input data\samples\synth_small.log --backend openmp --workers 4
mpiexec -n 4 python -m hpc_engine.analyze --backend mpi --input data\samples\synth_small.log --workers 4
```

Directory merge is **CLI only** (`--input-dir`). The web upload stays a **single** `.log` / `.txt` file.

---

## Optional components

| Piece | Needed for minimum demo? | How |
| ----- | ------------------------ | --- |
| Ollama `llama3.2:3b` | No | Install Ollama; `ollama pull llama3.2:3b`. UI AI button returns 503 if missing. |
| OpenMP native worker | No | [docs/SETUP.md](docs/SETUP.md) — `native/openmp_worker` (`make` / `make dll`) |
| Microsoft MPI + mpi4py | No | Only for `--backend mpi` |
| 100 MB / 500 MB synth files | No | Generate locally via `backend/scripts/generate_synthetic_logs.py` if you want to reproduce PERFORMANCE.md |

---

## macOS / Linux (short)

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt          # skip mpi4py if OpenMPI is absent
export PYTHONPATH=backend
export JWT_SECRET=faculty-local-secret
python backend/scripts/reset_db.py
uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
# second terminal:
cd frontend && npm install && npm run dev
```

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `No module named app` / `hpc_engine` | `$env:PYTHONPATH = "backend"` from **repo root** |
| UI loads, API 404 / network error | Uvicorn must be on **8000**; use **5173** for the UI, not 8000 |
| Login fails | **Register** first; `reset_db.py` wipes users |
| `mpi4py` install error | Comment it out; use `process` |
| OpenMP job errors | Expected without the native library; switch backend to `process` |
| Execution policy | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| Port in use | Stop the other process or change ports |

---

## What this is not

- Not CUDA / GPU acceleration (unsuitable without an NVIDIA device)  
- Not a production SIEM (Splunk / Elastic / Datadog)  
- Not multi-node cluster MPI  
- Not real-time streaming ingest  
- Not a requirement to copy this author’s dataset folder  

---

## Tech stack

Python 3.12 · FastAPI · SQLite · React 18 + Vite · Recharts · ProcessPool / OpenMP / mpi4py · Ollama (optional)

---

## Documentation

| Doc | Use |
| --- | --- |
| [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md) / [docs/PROJECT_REPORT.docx](docs/PROJECT_REPORT.docx) | Formal project report (print Word) |
| [docs/FACULTY_BRIEFING.md](docs/FACULTY_BRIEFING.md) | Defend the project in a viva |
| [docs/COURSE_ALIGNMENT.md](docs/COURSE_ALIGNMENT.md) | CSE 471 CLO / week map |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Measured tables only |
| [docs/FACULTY_SPEECH_10MIN.md](docs/FACULTY_SPEECH_10MIN.md) | 10-minute talk + slide clicks |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | ≤ 5 minute live demo |

---

## Non-negotiable pillars

1. **Correctness** — sequential ≡ parallel (pytest, all available backends)  
2. **Performance** — measurable speedup  
3. **Scalability** — strong scaling (+ weak scaling)  
4. **Evidence** — real benchmark data only  
5. **Modularity** — HPC engine independent of the web app  

## License

MIT. See [LICENSE](LICENSE).
