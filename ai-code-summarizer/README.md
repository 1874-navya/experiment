# CodeScope — AI Code Summarizer

Open-source developer UI for code explanation with direct paste, multi-file uploads, ZIP ingestion, and asynchronous hierarchical analysis.

## Stack
- Frontend: Next.js, TypeScript, Tailwind CSS, Monaco Editor, Lucide icons.
- API: FastAPI. Worker: Celery + Redis. AI: configurable OpenAI-compatible API.
- Local runtime: Docker Compose.

## Start
1. Copy .env.example to .env and set LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL.
2. Run docker compose up --build.
3. Open http://localhost:3000. API docs: http://localhost:8000/docs.

Large sources are split into overlapping bounded chunks, summarized in stages, then reduced to file and project summaries. There is no unlimited size: runtime limits and model quotas must be configured. Submitted code is untrusted and is never executed.

Before public production deployment add authentication, tenant isolation, persistent job metadata, private object storage, quotas, retention cleanup, malware scanning, observability, TLS, and autoscaling. This is a runnable starter, not a claim those deployment-specific controls are already complete.
