"""Text, Markdown, and subtitle adapters preserve encoding and structural syntax."""

import re
from dataclasses import dataclass
from typing import BinaryIO

from ardi_redact.detection import PLACEHOLDER_PATTERN
from ardi_redact.redaction import TextUnit, apply_edits


def _protect_matches(source: str, patterns: list[str]) -> set[int]:
  protected: set[int] = set()
  for pattern in patterns:
    for match in re.finditer(pattern, source, re.MULTILINE):
      protected.update(range(match.start(), match.end()))
  return protected


def markdown_unit(source: str) -> TextUnit:
  # Hide syntax from NER, but keep the content of code blocks, inline code,
  # link labels, and link destinations eligible for detection.
  protected = _protect_matches(
    source,
    [
      r"^[ \t]{0,3}(?:`{3,}|~{3,})[^\r\n]*",  # fence + language
      r"^[ \t]{0,3}(?:#{1,6}\s+|(?:>\s*)+|[-+*]\s+|\d+[.)]\s+)",
      r"^[ \t]*(?:[-*_][ \t]*){3,}$",  # thematic rules
      r"!?\[|\]\(|\](?=\[)|\[|\]|[()]|`+|\*+|(?<!\w)_+|_+(?!\w)|~~|(?<=\n)\|",
      r"\\(?=[!\"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])",
    ],
  )
  # Retain existing placeholders as tokens so the detector can protect them.
  boundaries = _protect_matches(source, [r"\]\(|\](?=\[)|(?<=\()mailto:"])
  for match in PLACEHOLDER_PATTERN.finditer(source):
    protected.difference_update(range(match.start(), match.end()))
  return TextUnit.project(source, protected, boundaries)


@dataclass
class TextFile:
  chunks: list[str]
  units: list[TextUnit]
  editable: list[int]
  encoding: str
  warnings: list[str]
  bom: bytes = b""

  def write(self, edits: list[dict[int, str]], stream: BinaryIO) -> None:
    chunks = self.chunks.copy()
    for index, changes in zip(self.editable, edits, strict=True):
      chunks[index] = apply_edits(chunks[index], changes)
    stream.write(self.bom + "".join(chunks).encode(self.encoding))


TIMING = re.compile(
  r"^(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}\s+-->\s+"
  r"(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}(?:[ \t]+[^\r\n]*)?[\r\n]*$"
)


def _subtitle(source: str, suffix: str, encoding: str, bom: bytes = b"") -> TextFile:
  blocks = re.split(r"((?:\r?\n){2,})", source)
  units: list[TextUnit] = []
  chunks: list[str] = []
  editable: list[int] = []
  warnings: list[str] = []
  if suffix == ".vtt" and not source.startswith("WEBVTT"):
    raise ValueError("VTT input must start with WEBVTT.")
  for block in blocks:
    lines = block.splitlines(keepends=True)
    if not lines or not block.strip():
      chunks.append(block)
      continue
    first = lines[0].strip()
    if suffix == ".vtt" and (
      first.startswith("WEBVTT")
      or first in {"STYLE", "REGION"}
      or first == "NOTE"
      or first.startswith("NOTE ")
      or first.startswith("NOTE\t")
    ):
      chunks.append(block)
      warnings.append("VTT metadata, notes, and styles are preserved and not scanned.")
      continue
    timing = next((index for index, line in enumerate(lines[:2]) if TIMING.match(line)), None)
    if timing is None:
      raise ValueError("Invalid subtitle cue: expected an identifier and timestamp line.")
    chunks.append("".join(lines[: timing + 1]))
    content = "".join(lines[timing + 1 :])
    editable.append(len(chunks))
    chunks.append(content)
    protected = _protect_matches(content, [r"<[^>]*>", r"\{\\[^}]*\}"])
    units.append(TextUnit.project(content, protected))
  return TextFile(chunks, units, editable, encoding, sorted(set(warnings)), bom)


def prepare_text(data: bytes, suffix: str) -> TextFile:
  bom = b""
  encoding = "utf-8"
  if data.startswith((b"\xff\xfe", b"\xfe\xff")):
    bom, data = data[:2], data[2:]
    encoding = "utf-16-le" if bom == b"\xff\xfe" else "utf-16-be"
  if data.startswith(b"\xef\xbb\xbf"):
    encoding = "utf-8-sig"
  source = data.decode(encoding)
  if suffix in {".vtt", ".srt"}:
    return _subtitle(source, suffix, encoding, bom)
  unit = markdown_unit(source) if suffix == ".md" else TextUnit.project(source)
  return TextFile([source], [unit], [0], encoding, [], bom)
