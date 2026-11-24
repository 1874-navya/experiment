from pathlib import Path, PurePosixPath
import zipfile

from app.config import get_settings

SKIP_DIRS = {
    ".git", ".next", ".venv", "venv", "__pycache__", "node_modules",
    "dist", "build", "coverage", "vendor", ".idea", ".vscode",
}
ALLOWED_SUFFIXES = {
    ".py", ".pyi", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".java", ".kt", ".go", ".rs", ".c", ".h", ".cpp", ".hpp",
    ".cs", ".php", ".rb", ".swift", ".sql", ".sh", ".bash",
    ".yaml", ".yml", ".toml", ".json", ".xml", ".html", ".css",
    ".scss", ".md", ".txt", ".ipynb", ".tf",
}


def safe_extract_zip(archive: Path, target: Path, max_bytes: int, max_files: int) -> None:
    total_bytes = 0
    file_count = 0
    root = target.resolve()

    with zipfile.ZipFile(archive) as zip_file:
        for info in zip_file.infolist():
            if info.is_dir():
                continue

            relative = PurePosixPath(info.filename.replace("\\", "/"))
            if relative.is_absolute() or ".." in relative.parts:
                continue
            # Unix symlink entries must not be extracted as files.
            mode = info.external_attr >> 16
            if mode & 0o170000 == 0o120000:
                continue

            file_count += 1
            total_bytes += info.file_size
            if file_count > max_files or total_bytes > max_bytes:
                raise ValueError("ZIP expansion exceeds configured file or size limits.")

            destination = (root / Path(*relative.parts)).resolve()
            if root not in destination.parents:
                continue

            destination.parent.mkdir(parents=True, exist_ok=True)
            with zip_file.open(info) as source, destination.open("wb") as sink:
                copied = 0
                while block := source.read(1024 * 1024):
                    copied += len(block)
                    if copied > info.file_size or copied + (total_bytes - info.file_size) > max_bytes:
                        raise ValueError("ZIP expansion exceeds configured size limit.")
                    sink.write(block)


def collect_source_files(workspace: Path) -> list[tuple[str, str]]:
    settings = get_settings()
    extracted = workspace / "extracted"
    extracted.mkdir(exist_ok=True)

    for archive in (workspace / "uploads").glob("*.zip"):
        safe_extract_zip(
            archive,
            extracted,
            settings.max_archive_expanded_mb * 1024 * 1024,
            settings.max_files,
        )

    files: list[tuple[str, str]] = []
    total_chars = 0

    for root in (workspace / "pasted", workspace / "uploads", extracted):
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            relative_parts = path.relative_to(root).parts
            if any(part in SKIP_DIRS or part.startswith(".") for part in relative_parts):
                continue
            if path.suffix.lower() == ".zip":
                continue
            if path.suffix.lower() not in ALLOWED_SUFFIXES and path.name.lower() not in {"dockerfile", "makefile"}:
                continue

            raw = path.read_bytes()
            if b"\x00" in raw:
                continue
            source = raw.decode("utf-8", errors="replace")
            if not source.strip():
                continue

            if len(files) >= settings.max_files:
                raise ValueError("Project exceeds the configured maximum file count.")
            total_chars += len(source)
            if total_chars > settings.max_code_chars:
                raise ValueError("Project exceeds the configured source-character limit.")

            label = root.name + "/" + path.relative_to(root).as_posix()
            files.append((label, source))

    return files
