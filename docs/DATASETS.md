# Datasets

Large files stay on `E:\datasets\log-intelligence\` and are **not** committed. Only `data/samples/synth_small.log` is in git for CI.

## Generated synthetic application logs (Day 1)

Format: `TIMESTAMP LEVEL service message ip=… METHOD path status=… latency_ms=…`  
Generator: `backend/scripts/generate_synthetic_logs.py` (seeded, deterministic).  
License: original synthetic data for this academic project.

| File | Location | Size (bytes) | Lines | SHA-256 |
| ---- | -------- | ------------ | ----- | ------- |
| `synth_small.log` | `data/samples/synth_small.log` | 262,218 (~256 KB) | 2,258 | `56839bf2405bf496efab85787aaf41f2b4064aa391d9441b19b8df9b11e15217` |
| `synth_10mb.log` | `E:\datasets\log-intelligence\generated\synth_10mb.log` | 10,485,804 | 90,161 | `5439df3ac117da814aed64730377886e04bfe15d0e8855e2a857e99ecf15015d` |
| `synth_100mb.log` | `E:\datasets\log-intelligence\generated\synth_100mb.log` | 104,857,682 | 901,610 | `dc166b092e20addf748e8434246b67a0906d9cf52a01298bfc3007d7e01c5b3b` |
| `synth_500mb.log` | `E:\datasets\log-intelligence\generated\synth_500mb.log` | 524,288,079 | 4,508,066 | `d5555fbc9e88e2eda1ec98c9a77d48615ae59f9ca48cfe67feccdd742282247f` |
| `synth_50mb.log` | `E:\datasets\log-intelligence\generated\synth_50mb.log` | 52,428,912 | 450,748 | `41883ed9ffd05f60be640d795302b0f64e24298abbdd76027136dc5c99e311a5` |
| `synth_200mb.log` | `E:\datasets\log-intelligence\generated\synth_200mb.log` | 209,715,296 | 1,803,169 | `ed88f0b731979c38c0fe390f66e178a614febf346a4910cc38e5bdb694e76dcd` |

Spot-check (first lines of `synth_small.log`):

```text
2026-08-01T00:00:00.018Z INFO auth-service cache hit ip=203.0.113.10 PUT /api/login status=404 latency_ms=3687
2026-08-01T00:00:00.067Z WARNING auth-service rate limit approaching ip=192.0.2.28 DELETE /api/login status=403 latency_ms=22
```

Mix includes INFO/WARNING/ERROR/CRITICAL, fake IPs, services, and HTTP-ish fields. Re-verify a random sample yourself before Day 2 parsing.

## Public sources (optional later)

| Source | Use | Citation |
| ------ | --- | -------- |
| [Loghub (LogPAI)](https://github.com/logpai/loghub) | Real system logs (HDFS, Apache, …) | Cite Loghub if used in the report |
| NASA HTTP logs | Public web access logs | Cite if downloaded |
| [SecRepo](https://www.secrepo.com/) | Security-oriented samples | Cite if used |

Download any public set to `E:\datasets\log-intelligence\raw\` and record license + checksum here before using it.

## Hygiene

- Do not commit secrets, real emails, or production credentials.
- Sanitize IPs if faculty ethics rules require it.
- `synth_1gb.log` is optional stretch; not generated for Stage 1. Re-generate 500 MB only with `--also-500mb` (do not rewrite small/10/100).
