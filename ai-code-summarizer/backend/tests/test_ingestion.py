from pathlib import Path
import zipfile

from app.ingestion import safe_extract_zip


def test_zip_extraction_skips_path_traversal(tmp_path: Path):
    archive = tmp_path / "project.zip"
    target = tmp_path / "out"
    target.mkdir()
    with zipfile.ZipFile(archive, "w") as handle:
        handle.writestr("../escape.py", "print('no')")
        handle.writestr("src/main.py", "print('yes')")
    safe_extract_zip(archive, target, max_bytes=10000, max_files=10)
    assert not (tmp_path / "escape.py").exists()
    assert (target / "src" / "main.py").read_text() == "print('yes')"


def test_zip_extraction_enforces_expansion_limit(tmp_path: Path):
    archive = tmp_path / "project.zip"
    target = tmp_path / "out"
    target.mkdir()
    with zipfile.ZipFile(archive, "w") as handle:
        handle.writestr("large.py", "x" * 100)
    try:
        safe_extract_zip(archive, target, max_bytes=10, max_files=10)
        raise AssertionError("Expected size limit to fail")
    except ValueError as exc:
        assert "limit" in str(exc).lower()
