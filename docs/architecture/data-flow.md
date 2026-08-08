# Stage 1 Data Flow

```mermaid
flowchart LR
  Select[Select_Log_File] --> Dataset[Dataset_Manager]
  Dataset --> Detect[Format_Detection]
  Detect --> Canon[Canonical_Parser]
  Canon --> Seq[Sequential_Baseline]
  Seq --> Par[Parallel_Engine]
  Par --> W1[Worker_1]
  Par --> W2[Worker_2]
  Par --> Wn[Worker_N]
  W1 --> P1[Partial_Result]
  W2 --> P2[Partial_Result]
  Wn --> Pn[Partial_Result]
  P1 --> Merge[Deterministic_Merge]
  P2 --> Merge
  Pn --> Merge
  Merge --> Ev[Final_Evidence]
  Ev --> Dash[Dashboard]
  Ev --> AI[AI_Summary]
```

## InputSource

```text
InputSource
  ├── FileInputSource          ← Stage 1
  ├── DirectoryInputSource     ← future
  ├── ArchiveInputSource       ← future
  ├── StreamInputSource        ← future
  ├── NetworkInputSource       ← future
  └── MessageQueueInputSource  ← future
```

Engine contract:

```text
Input Source → Canonical Event Stream → Processing Engine
```

## AI contract

The LLM must **never** receive raw multi-GB logs.

```text
Evidence + Analytics + Metrics + Findings → AI → Explanation
```

## Job lifecycle

```text
queued → running → aggregating → completed | failed
```

## Storage

- Raw logs: local filesystem (`E:\datasets\log-intelligence\`), immutable artifact.
- SQLite: users, dataset metadata, jobs, aggregates, evidence, benchmark runs, AI reports.
- Never store multi-GB log **content** in SQLite.
