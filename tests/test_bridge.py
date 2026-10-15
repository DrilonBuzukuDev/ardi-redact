from pathlib import Path
import bridge


def test_redact_preserves_original_and_refuses_existing_output(tmp_path, monkeypatch, nlp):
    monkeypatch.setattr(bridge, "load_model", lambda _: nlp)
    source = tmp_path / "notes.txt"
    source.write_text("John Smith lives in Vienna.")
    result = bridge.redact(source, "en")
    assert result["counts"] == {"PERSON": 1, "LOCATION": 1}
    assert source.read_text() == "John Smith lives in Vienna."
    assert "John Smith" not in str(result)
    assert "already exists" in bridge.redact(source, "en")["error"]


def test_parser_error_never_contains_document_text(tmp_path, monkeypatch, nlp):
    monkeypatch.setattr(bridge, "load_model", lambda _: nlp)
    source = tmp_path / "bad.docx"
    source.write_text("PRIVATE DOCUMENT CONTENT")
    result = bridge.redact(source, "en")
    assert "error" in result
    assert "PRIVATE DOCUMENT CONTENT" not in str(result)


def test_rejects_unsupported_input(tmp_path):
    assert "error" in bridge.redact(tmp_path, "en")
    assert "error" in bridge.redact(Path("missing.txt"), "xx")
