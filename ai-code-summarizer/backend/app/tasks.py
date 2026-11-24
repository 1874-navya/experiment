from pathlib import Path

from celery import Celery

from app.analyzer import summarize_project
from app.config import get_settings
from app.ingestion import collect_source_files

settings = get_settings()
celery_app = Celery("code_summarizer", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    result_expires=86400,
    worker_prefetch_multiplier=1,
)


@celery_app.task(bind=True, name="app.tasks.analyze_project")
def analyze_project(self, job_id: str, workspace_path: str):
    files = collect_source_files(Path(workspace_path))
    if not files:
        raise ValueError("No supported text source files were found.")

    def report(file_index, file_count, path, chunk_index, chunk_count):
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "Analyzing " + path,
                "file_index": file_index + 1,
                "file_count": file_count,
                "chunk_index": chunk_index,
                "chunk_count": chunk_count,
            },
        )

    result = summarize_project(files, progress=report)
    result["job_id"] = job_id
    return result
