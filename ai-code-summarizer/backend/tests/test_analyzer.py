from app.analyzer import python_metadata, split_into_chunks


def test_split_into_chunks_respects_limit():
    source = "\n".join("line " + str(index) for index in range(200))
    chunks = split_into_chunks(source, 120, 20)
    assert len(chunks) > 1
    assert all(len(chunk) <= 120 for chunk in chunks)


def test_empty_source():
    assert split_into_chunks("", 100, 10) == []


def test_python_metadata():
    source = "import json\nfrom pathlib import Path\n\nclass Example:\n    def run(self):\n        return json.dumps({})\n"
    result = python_metadata("example.py", source)
    names = {item["name"] for item in result["symbols"]}
    assert {"Example", "run"} <= names
    assert "json" in result["imports"]
    assert "pathlib" in result["imports"]


def test_syntax_error_is_reported():
    assert "parse_warning" in python_metadata("bad.py", "def broken(:")
