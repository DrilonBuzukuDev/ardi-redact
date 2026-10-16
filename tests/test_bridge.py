from pathlib import Path
import bridge


def test_redact_preserves_original_and_refuses_existing_output(tmp_path, monkeypatch, nlp):
    monkeypatch.setattr(bridge, "load_model", lambda _: nlp)
    source = tmp_path / "notes.txt"
    source.write_text("John Smith lives in Vienna.")
    result = bridge.redact(source, "en", tmp_path / (source.stem + "_pii" + source.suffix))
    assert result["counts"] == {"PERSON": 1, "LOCATION": 1}
    assert source.read_text() == "John Smith lives in Vienna."
    assert "John Smith" not in str(result)
    assert "already exists" in bridge.redact(source, "en", tmp_path / (source.stem + "_pii" + source.suffix))["error"]


def test_parser_error_never_contains_document_text(tmp_path, monkeypatch, nlp):
    monkeypatch.setattr(bridge, "load_model", lambda _: nlp)
    source = tmp_path / "bad.docx"
    source.write_text("PRIVATE DOCUMENT CONTENT")
    result = bridge.redact(source, "en", tmp_path / (source.stem + "_pii" + source.suffix))
    assert "error" in result
    assert "PRIVATE DOCUMENT CONTENT" not in str(result)


def test_rejects_unsupported_input(tmp_path):
    assert "error" in bridge.redact(tmp_path, "en", tmp_path / "output.txt")
    assert "error" in bridge.redact(Path("missing.txt"), "xx", tmp_path / "output.txt")


def test_redact_uses_selected_output(tmp_path, monkeypatch, nlp):
    monkeypatch.setattr(bridge, "load_model", lambda _: nlp)
    source = tmp_path / "notes.txt"
    source.write_text("John Smith")
    folder = tmp_path / "selected"
    folder.mkdir()
    output = folder / "shared.txt"
    result = bridge.redact(source, "en", output)
    assert result["output"] == str(output)
    assert output.read_text() == "[PERSON_1]"


def test_rejects_different_output_format(tmp_path):
    source = tmp_path / "notes.txt"
    source.write_text("John Smith")
    output = tmp_path / "shared.docx"
    assert "same file extension" in bridge.redact(source, "en", output)["error"]
    assert not output.exists()
