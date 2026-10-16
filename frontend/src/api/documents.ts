import {
  SelectDocument,
  Redact,
  RevealDocument,
} from "../../wailsjs/go/main/App";
import { OnFileDrop, OnFileDropOff } from "../../wailsjs/runtime/runtime";

import type { engine } from "../../wailsjs/go/models";

export type RedactionResult = engine.Result;
export const extensions = ["docx", "md", "txt", "srt", "vtt"];
export async function selectDocument() {
  if (!window.go) throw new Error("Open the desktop app to choose a document.");
  return SelectDocument();
}
export function listenForDocuments(onDrop: (paths: string[]) => void) {
  if (!window.runtime) return () => {};
  OnFileDrop((_x, _y, paths) => onDrop(paths), true);
  return OnFileDropOff;
}
export const redactDocument = (
  path: string,
  language: string,
): Promise<RedactionResult> => Redact(path, language);
export const revealDocument = () => RevealDocument();
