"""Private desktop entry point. Emits metadata only, never document contents."""

import json
import sys
from pathlib import Path

# -I ignores the launcher's Python settings; add only the embedded engine directory.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ardi_redact.detection import Detector
from ardi_redact.formats import SUPPORTED
from ardi_redact.models import MODELS, load_model
from ardi_redact.processing import process_file


def redact(path: Path, language: str) -> dict:
    if language not in MODELS:
        return {"error": "Choose a supported document language."}
    if not path.is_file() or path.is_symlink():
        return {"error": "Choose an existing document file. Linked files are not supported."}
    if path.suffix.lower() not in SUPPORTED:
        return {"error": "Choose a DOCX, Markdown, TXT, SRT, or VTT document."}
    try:
        detector = Detector(load_model(language))
        result = process_file(path, detector)
    except FileExistsError:
        return {"error": "A redacted copy already exists. Move or rename it before trying again."}
    except Exception:
        return {"error": "Could not process this document. Check its format and folder permissions."}
    return {"output": str(result.output.absolute()), "counts": dict(result.counts), "warnings": result.warnings}


def main() -> None:
    try:
        if len(sys.argv) == 2 and sys.argv[1] == "--verify":
            for model in MODELS.values():
                load_model(model)
            response = {"ready": True}
        else:
            response = redact(Path(sys.argv[1]), sys.argv[2])
    except Exception:
        response = {"error": "The document engine could not start. Run setup to repair it."}
    print(json.dumps(response))


if __name__ == "__main__":
    main()
