# Security (Stage 1)

## Application security

| Area | Rule |
| ---- | ---- |
| Authentication | JWT |
| Passwords | Hash only — never plaintext |
| Upload validation | Extension, MIME, size, allowed format, filename safety |
| Path safety | Use Dataset ID internally — never trust client paths |
| Resource limits | Max file size, simultaneous jobs, worker count, AI prompt size |

## Detection heuristics (deterministic)

| Pattern | Signal |
| ------- | ------ |
| Authentication burst | > X failures from same IP within Y minutes |
| HTTP error spike | 5xx rate > baseline |
| Suspicious access | Many endpoints from one IP in a short window |
| Scanning | Many 404s across many paths |
| Sensitive paths | `/admin`, `/.env`, `/config` |

Produce: Finding, Severity, Evidence, Timestamp, Source, Count.

Avoid: “This is definitely an attack.”  
Prefer: “Potential brute-force activity detected.”

AI receives **structured evidence**, never raw logs.
