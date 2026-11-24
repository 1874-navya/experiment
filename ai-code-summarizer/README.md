# CodeScope — AI Code Summarizer

A developer-facing application for understanding pasted code, individual source files, and complete projects.

## Product features
- Direct code paste in Monaco Editor with syntax highlighting.
- Multiple file uploads, drag-and-drop, and ZIP project ingestion.
- Per-file and project-level explanations with source metrics and Python symbols/imports.
- Background analysis with Celery/Redis and job-status polling.
- Bounded overlapping code chunks and hierarchical summaries for large inputs.
- Submitted source is treated as untrusted data and is never executed.

## Stack
Next.js + TypeScript + Tailwind CSS + Monaco Editor; FastAPI; Celery + Redis; configurable OpenAI-compatible LLM endpoint; Docker Compose.

## Run locally
1. Copy .env.example to .env.
2. Set LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL.
3. Run docker compose up --build.
4. Open http://localhost:3000. API docs: http://localhost:8000/docs.

## Large project handling
The worker inventories supported source files, safely expands ZIPs, skips common vendor/build directories and binary files, extracts Python symbols/imports, chunks source within configured character limits, summarizes individual chunks, reduces them into file summaries, then combines those into a project summary.

No system can handle literally unlimited input. Configure upload, expanded archive, file-count, source-character, concurrency, and model limits for available infrastructure. For very large repositories, use private object storage, durable job metadata, incremental indexing, and autoscaling workers.

## Production hardening still required
This repository contains a runnable starter architecture. Before internet-facing production use, add authentication/authorization, tenant isolation, persistent job metadata, private object storage, rate limiting and quotas, retention cleanup, malware scanning, audit logs, observability, TLS, managed secrets, backups, and deployment-specific scaling. Configure CORS to the actual frontend origin. Do not expose this unauthenticated starter API publicly.
