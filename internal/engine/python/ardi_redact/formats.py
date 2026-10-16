"""Dispatch supported documents to format adapters with a shared text protocol."""

from pathlib import Path
from typing import BinaryIO, Protocol

from ardi_redact.docx_format import DocxFile
from ardi_redact.redaction import TextUnit
from ardi_redact.text_formats import prepare_text

SUPPORTED = frozenset({".txt", ".md", ".srt", ".vtt", ".docx"})


class PreparedFile(Protocol):
  units: list[TextUnit]
  warnings: list[str]

  def write(self, edits: list[dict[int, str]], stream: BinaryIO) -> None: ...


def prepare(path: Path) -> PreparedFile:
  suffix = path.suffix.lower()
  if suffix not in SUPPORTED:
    raise ValueError("Unsupported file format.")
  data = path.read_bytes()
  return DocxFile(data) if suffix == ".docx" else prepare_text(data, suffix)
