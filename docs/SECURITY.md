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

Implemented in `backend/app/security/heuristics.py`. Thresholds:

| Pattern | Signal | Stage 1 threshold |
| ------- | ------ | ----------------- |
| Authentication burst | Failures from same IP (status 401 or "Failed password") | total >= 40 **or** any minute >= 15 |
| HTTP error spike | 5xx / valid records | rate > 0.15 |
| Suspicious access | Distinct endpoints from one IP | >= 6 paths |
| Scanning | 404s from one IP across many paths | >= 20 404s and >= 4 paths |
| Sensitive paths | `/admin`, `/.env`, `/config` | total hits >= 10 |

Produce: Finding, Severity, Evidence, Source IPs, Count.

Avoid: “This is definitely an attack.”  
Prefer: “Potential brute-force activity detected.”

AI receives **structured evidence**, never raw logs.
