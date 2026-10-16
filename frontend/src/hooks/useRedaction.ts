import { useCallback, useEffect, useRef, useState } from "react";
import {
  extensions,
  discardRedaction,
  saveRedactedFile,
  listenForDocuments,
  redactDocument,
  revealDocument,
  selectDocument,
  selectOutput,
  type RedactionResult,
} from "../api/documents";

export function useRedaction() {
  const [path, setPath] = useState("");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RedactionResult | null>(null);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const locked = useRef(false);

  const accept = useCallback((paths: string[]) => {
    if (locked.current) return;
    setError("");
    setFileError("");
    if (paths.length !== 1) {
      setFileError("Choose one document at a time.");
      return;
    }
    if (!extensions.includes(paths[0].split(".").pop()?.toLowerCase() || "")) {
      setFileError("Choose a DOCX, Markdown, TXT, SRT, or VTT document.");
      return;
    }
    setPath(paths[0]);
    setResult(null);
  }, []);

  useEffect(() => {
    try {
      return listenForDocuments(accept);
    } catch {
      setError("Drag and drop is unavailable. Use Select file.");
    }
  }, [accept]);

  const select = async () => {
    if (locked.current) return;
    try {
      const selected = await selectDocument();
      if (selected) accept([selected]);
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    }
  };
  const run = async () => {
    if (locked.current) return;
    if (!path) {
      setFileError("Choose a file to redact.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    setFileError("");
    setResult(null);
    try {
      setResult(await redactDocument(path, language));
    } catch (cause) {
      setFileError(String(cause instanceof Error ? cause.message : cause));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const save = async () => {
    if (locked.current || !result || result.output) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const output = await selectOutput(path);
      if (!output) return;
      const saved = await saveRedactedFile(output);
      setResult({ ...result, output: saved });
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const reveal = async () => {
    if (!result) return;
    try {
      await revealDocument();
    } catch {
      setError(
        "Could not open the folder. The saved document path is shown above.",
      );
    }
  };
  const reset = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await discardRedaction();
      setPath("");
      setResult(null);
      setFileError("");
    } catch {
      setError("Could not discard the temporary copy. Try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return {
    path,
    language,
    setLanguage,
    busy,
    result,
    total: Object.values(result?.counts ?? {}).reduce(
      (sum, count) => sum + count,
      0,
    ),
    error,
    fileError,
    select,
    run,
    save,
    reveal,
    reset,
  };
}
