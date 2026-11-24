import uuid
from pathlib import Path

from celery.result import AsyncResult
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.tasks import analyze_project, celery_app

settings = get_settings()
app = FastAPI(
    title="AI Code Summarizer API",
    version="0.1.0",
    description="Background API for safe, hierarchical source-code analysis.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/analyze", status_code=202)
async def submit_analysis(
    code: str | None = Form(default=None),
    language: str = Form(default="python"),
    files: list[UploadFile] = File(default=[]),
):
    if not (code and code.strip()) and not files:
        raise HTTPException(status_code=400, detail="Paste code or attach at least one file.")

    job_id = str(uuid.uuid4())
    workspace = settings.shared_data_dir / job_id
    (workspace / "pasted").mkdir(parents=True, exist_ok=True)
    (workspace / "uploads").mkdir(parents=True, exist_ok=True)

    extensions = {
        "python": ".py", "typescript": ".ts", "javascript": ".js",
        "java": ".java", "sql": ".sql", "go": ".go", "plaintext": ".txt",
    }
    if code and code.strip():
        if len(code) > settings.max_code_chars:
            raise HTTPException(status_code=413, detail="Pasted code exceeds configured size limit.")
        extension = extensions.get(language.lower(), ".txt")
        (workspace / "pasted" / ("pasted_code" + extension)).write_text(code, encoding="utf-8")

    total_bytes = 0
    for upload in files:
        filename = Path(upload.filename or "upload.txt").name
        if filename in {"", ".", ".."}:
            continue
        content = await upload.read(settings.max_upload_mb * 1024 * 1024 + 1)
        if len(content) > settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail=filename + " exceeds per-file upload limit.")
        total_bytes += len(content)
        if total_bytes > settings.max_total_upload_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Uploads exceed combined size limit.")
        destination = workspace / "uploads" / filename
        if destination.exists():
            raise HTTPException(status_code=400, detail="Duplicate upload filename: " + filename)
        destination.write_bytes(content)

    analyze_project.apply_async(args=[job_id, str(workspace)], task_id=job_id)
    return {"job_id": job_id, "status": "QUEUED"}


@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id: str):
    try:
        uuid.UUID(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid job ID.") from exc

    task = AsyncResult(job_id, app=celery_app)
    response = {"job_id": job_id, "status": task.status}
    if task.status == "SUCCESS":
        response["result"] = task.result
    elif task.status == "FAILURE":
        response["error"] = str(task.result)
    elif isinstance(task.info, dict):
        response["progress"] = task.info
    return response
