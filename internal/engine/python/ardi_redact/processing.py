"""File processing and atomic output publication."""

import os
import tempfile
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from ardi_redact.detection import Detector
from ardi_redact.formats import prepare
from ardi_redact.redaction import Redactor


@dataclass(frozen=True)
class Result:
  output: Path
  counts: Counter[str]
  warnings: list[str]


def output_path(path: Path) -> Path:
  return path.with_name(f"{path.stem}_pii{path.suffix}")


def process_file(
  path: Path, detector: Detector, *, output: Path | None = None
) -> Result:
  output = output if output is not None else output_path(path)
  if output.exists():
    raise FileExistsError("A file already exists at this location. Choose a different name or folder.")
  if output.is_symlink() or (output.exists() and output.samefile(path)):
    raise ValueError("Output points to an original or a symlink; refusing to replace it.")
  prepared = prepare(path)
  redactor = Redactor()
  redactor.reserve([unit.source for unit in prepared.units])
  edits = [
    redactor.edits(unit, detections)
    for unit, detections in zip(
      prepared.units, detector.batch(unit.text for unit in prepared.units), strict=True
    )
  ]
  descriptor, temporary = tempfile.mkstemp(prefix=".ardi-redact-", dir=output.parent)
  try:
    with os.fdopen(descriptor, "wb") as stream:
      prepared.write(edits, stream)
      stream.flush()
      os.fsync(stream.fileno())
    # Atomic exclusive publication also protects against concurrent runs.
    os.link(temporary, output)
  finally:
    Path(temporary).unlink(missing_ok=True)
  return Result(output, redactor.counts, prepared.warnings)
