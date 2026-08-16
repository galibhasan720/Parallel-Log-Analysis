# 10-minute faculty speech — Parallel Log Intelligence

**Deck:** [Parallel_Log_Intelligence_Faculty.pptx](Parallel_Log_Intelligence_Faculty.pptx) (24 slides)  
**Evidence:** [PERFORMANCE.md](PERFORMANCE.md) · [COURSE_ALIGNMENT.md](COURSE_ALIGNMENT.md)  
**Spoken time:** ~10 minutes. Slide 24 is Q&A (not part of the 10 minutes).

---

## How to run this

1. Open the faculty PPTX in PowerPoint.
2. Start **Slide Show → Presenter View** (your laptop shows this script or the notes; the projector shows slides).
3. Click **exactly** when you see **[CLICK → Slide n]** — do it *before* you speak that slide’s first sentence.
4. Ask-the-room slides (2, 6, 17, 24): ask the question, **pause 5–8 seconds**, then the bridging line. Do not open a long discussion until slide 24.
5. Never invent numbers. If you forget a figure, say “it is in PERFORMANCE.md.”

**If the chair cuts you to 8 minutes:** keep clicking, but speak only one sentence on slides **11, 13, and 20** (skip path is marked).

---

## Timing map

| Clock | Slides | Section |
| ----- | ------ | ------- |
| 0:00–1:40 | 1–4 | Purpose |
| 1:40–3:50 | 5–9 | How it works |
| 3:50–5:10 | 10–12 | CSE 471 fit |
| 5:10–7:30 | 13–17 | Benchmark / honesty |
| 7:30–9:20 | 18–22 | Benefits, industry, trust |
| 9:20–10:00 | 23–24 | Close + open Q&A |

---

## Script

### Purpose (~1:40)

**[CLICK → Slide 1]** *(title — 20 s)*

Good [morning / afternoon]. Thank you for the time.

This is **Parallel Log Intelligence** — a CSE 471 Stage 2 project. In one sentence: we split a large log file across CPU cores, merge **one correct report**, and optionally explain that evidence with a **local** language model.

The machine we measured is a 12th Gen **i5-1235U**, twelve logical processors, 12 GB RAM, **Iris Xe**. There is **no CUDA device**. That is a suitability decision, not a missing checkbox.

**[CLICK → Slide 2]** *(ask the room — 25 s including pause)*

When something breaks in a product you run — an app, a bank portal, a campus system — **where do you look first?**

*(Pause 5–8 seconds. Take one or two words from the room.)*

Gut feel is fine. The first question is rarely “rewrite the product.” It is: **what do the logs say?**

**[CLICK → Slide 3]** *(purpose — 25 s)*

The whole system is four verbs: **decompose**, **analyze in parallel**, **merge**, and optionally **explain**.

AI is not the engine. If the local model is offline, analytics still work. The AI only sees totals and findings — never the raw multi-hundred-megabyte file.

**[CLICK → Slide 4]** *(problem — 30 s)*

The business cost is not disk space. It is **time-to-understand**.

Logs are the black box: logins, failures, slow APIs, suspicious IPs. Delayed reading means delayed recovery, delayed customer message, delayed trust. One day’s file can be hundreds of megabytes. Reading it on **one core** wastes the rest of the CPU.

Observability platforms exist for this idea. What we built is a **measurable parallel-computing prototype** of that idea — not a commercial SIEM.

---

### How it works (~2:10)

**[CLICK → Slide 5]** *(sequential pain — 25 s)*

On this laptop, sequential analysis of a **100 MB** synthetic log takes about **7.6 seconds**. **500 MB** takes about **44 seconds**. Reading the bytes of 100 MB takes about **0.05 seconds**. So the wait is not the disk. Interactive investigation cannot wait on one core.

**[CLICK → Slide 6]** *(ask + analogy — 25 s including pause)*

A 500-page incident report lands on the table. Do you want **one person** to read every page — or **eight people** each reading a chapter, then combining counts?

*(Pause 5–8 seconds.)*

That is high-performance computing. Same math. More workers. **One correct answer** — only if nobody double-counts pages. That is chunk alignment and an honest merge.

**[CLICK → Slide 7]** *(pipeline — 30 s)*

**Split. Analyze. Merge.**

The file is cut into byte chunks aligned to **full lines**. Workers parse independently. Each returns **small partial counts**, not millions of raw lines. A reducer merges them deterministically into one report: totals, errors, top services, security **findings** — evidence language, not “this is definitely an attack.”

Optional local AI explains **that report**, never the raw file.

**[CLICK → Slide 8]** *(System A / B — 25 s)*

Architecture freeze: two systems.

**System A** is the HPC engine. It runs from the **command line** with no website.

**System B** is the product: login, upload, job status — queued, running, aggregating, completed — dashboards, optional AI.

The website does **not** contain the parallel algorithm. If you want HPC, we can leave the UI and run the CLI. If you want a product story, we keep the UI.

**[CLICK → Slide 9]** *(four backends — 25 s)*

One job. Four ways to run it.

**ProcessPool** — several Python processes; default; strong on larger files.  
**Dynamic** — many small chunks for uneven work.  
**OpenMP** — native C, shared-memory threads.  
**MPI** — message-passing on **one node**, teaching path toward a cluster — not a cluster today.

Faculty hear multi-paradigm CPU HPC. Business hears: we did not lock the story to one library.

---

### CSE 471 fit (~1:20)

**[CLICK → Slide 10]** *(CLOs — 30 s)*

This is not a demo toy. It maps to course outcomes.

**CLO 1:** we measure — speedup, efficiency, strong and weak scaling.  
**CLO 2:** a real CLI and scripts, not only a GUI.  
**CLO 3:** a job lifecycle and local cluster-lite scripts. We are honest: this is **not** Slurm on a university cluster.

**[CLICK → Slide 11]** *(week map — 20 s)*  
*Skip path: “OpenMP weeks, MPI weeks, and GPU weeks we evaluated as unsuitable on Iris Xe.” Then click.*

Week by week: models and metrics; **OpenMP** in native C; **MPI** with mpiexec on one node. For the GPU / CUDA weeks we **evaluated suitability** and did not implement CUDA — Iris Xe has no CUDA device. Choosing CUDA would fail on this hardware.

**[CLICK → Slide 12]** *(why logs — 30 s)*

Why logs instead of a textbook matrix multiply?

It is an **industry workload**. After chunking it is embarrassingly parallel. **Correctness is non-trivial** — bad boundaries duplicate or drop lines. And 100 to 500 MB on a student laptop is enough to publish **T1, Sp, and Ep** without a supercomputer.

---

### Benchmark / honesty (~2:20)

**[CLICK → Slide 13]** *(protocol — 20 s)*  
*Skip path: “Warm-up discarded, timed runs, Sp = T1 over Tp.” Then click.*

How we measure: warm-up discarded; `time.perf_counter`; same file, parser, and analysis. Speedup is **T1 over Tp**. Efficiency is **Sp over p**. Strong scaling and weak scaling are both documented. No invented times.

**[CLICK → Slide 14]** *(100 MB chart — 45 s)*

**100 MB**, wall-clock versus workers. Sequential mean is **7.589 seconds**. Best mean is **3.899 seconds at 8 workers**. Speedup **S8 is about 1.95 times**. Efficiency about **0.24**.

Look at twelve workers: **slower than eight**. Overhead beat remaining work. That is expected on a hybrid performance / efficiency chip. We publish it instead of hiding it.

**[CLICK → Slide 15]** *(500 MB chart — 40 s)*

**500 MB.** Sequential about **44 seconds**. Best mean **17.287 seconds at 12 workers**. Speedup **S12 about 2.53 times**. Efficiency about **0.21**.

Larger parse work **amortizes** process startup, so twelve still wins wall-clock — still sublinear. Throughput goes from about **11.4 MB/s** sequential to about **28.9 MB/s** at twelve workers.

**[CLICK → Slide 16]** *(CPU-bound — 25 s)*

Is this disk-bound? No. Read-only is **0.048 seconds**. Parse-only about **5.6 seconds**. Parse plus analyze about **9 seconds**. Disk is roughly half a percent. Parallel CPUs help because **parsing** dominates.

**[CLICK → Slide 17]** *(ask honesty — 30 s including pause)*

Would you rather hear **“twelve times faster on twelve cores”** — or an **honest about 2×** we can defend?

*(Pause 5–8 seconds.)*

Serious faculty prefer the number that survives due diligence. Claiming **S12 equals 12** on this part would be false.

---

### Benefits, industry, trust (~1:50)

**[CLICK → Slide 18]** *(benefits — 25 s)*

Three audiences. One system.

**Faculty** get gradable HPC: OpenMP, MPI, ProcessPool, metrics, parity tests.  
**Students** get a real repo and honest tables — not a toy notebook.  
**Operators** get faster offline insight on CPUs they already own, with optional **local** explanation of aggregates.

**[CLICK → Slide 19]** *(vs typical tools — 40 s)*

Splunk, Elastic, Datadog — those are **production** ingest, search, and ops platforms. We do **not** replace them.

They already parallelize internally. What this project does is **teach and measure** that mechanism: four backends you can switch and time, a correctness contract, published speedup, laptop-scale, auditable.

Same problem class. Different job.

**[CLICK → Slide 20]** *(when it fits — 15 s)*  
*Skip path: “CPU-only, offline files, need proof, privacy.” Then click.*

Use this pattern when you have **CPU-only** hardware, **offline** large files, you **must prove** scaling, you care about **local** AI on aggregates, and faster is worthless unless counts **agree**.

**[CLICK → Slide 21]** *(pillars — 20 s)*

Faster is worthless if it is wrong. Sequential results **match** parallel — we test that. Performance is measured. Scaling is documented. Evidence is published. The engine runs **without** the website. Optional AI sees **aggregates only**.

**[CLICK → Slide 22]** *(scope — 20 s)*

Clear claims. **We did** laptop multi-paradigm HPC, 100 and 500 MB measured, web app plus CLI. **We did not** GPU acceleration on this machine, multi-node Slurm, streaming ingest, or a production SIEM. Honesty here is a strength.

---

### Close (~0:40)

**[CLICK → Slide 23]** *(close — 25 s)*

Many cores. One correct report.

We split large logs across CPUs, merge evidence you can audit, and optionally explain the **summary** — not the raw file.

Measured on this laptop: about **1.95 times** on 100 MB, about **2.53 times** on 500 MB.

The repo is **github.com/galibhasan720/Parallel-Log-Analysis**.

I am happy to take questions from faculty and from a business angle.

**[CLICK → Slide 24]** *(Q&A — remaining time)*

Three prompts if the room is quiet:

1. **Business:** Where does investigation time cost you the most today?  
2. **Faculty:** Which backend would you stress-test first — processes, OpenMP, or MPI?  
3. **Anyone:** What would you refuse to believe without a measured table?

Thank you.

*(Stop the 10-minute clock here. Answer from PERFORMANCE.md and COURSE_ALIGNMENT.md only.)*

---

## Do not say

- “Twelve times faster on twelve cores”
- “We replace Splunk”
- “The AI reads the whole log”
- “We use CUDA / GPU acceleration”
- Any number not on the slide or in PERFORMANCE.md

---

## Click checklist (print or keep beside the laptop)

1 Title → 2 Ask → 3 Purpose → 4 Cost → 5 Sequential → 6 Analogy → 7 Pipeline → 8 A/B → 9 Backends → 10 CLO → 11 Weeks → 12 Why logs → 13 Protocol → 14 Chart 100 → 15 Chart 500 → 16 CPU-bound → 17 Honest 2× → 18 Benefits → 19 vs tools → 20 When → 21 Trust → 22 Scope → 23 Close → 24 Q&A
