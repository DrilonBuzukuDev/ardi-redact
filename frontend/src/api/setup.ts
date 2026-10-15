import { Status, Setup, CancelSetup } from "../../wailsjs/go/main/App";
import { EventsOn } from "../../wailsjs/runtime/runtime";

import type { Progress } from "../types/setup";
export const getSetupStatus = async () => {
  if (!window.go)
    throw new Error("Open the desktop app to set up local redaction.");
  return Status();
};
export const prepareEngine = () => Setup();
export const cancelSetup = () => CancelSetup();
export const onSetupProgress = (callback: (progress: Progress) => void) =>
  window.runtime ? EventsOn("setup:progress", callback) : () => {};
