import { useMemo } from "react";

import { deepSignal, type DeepState } from "@dpsignal/core";
import "@preact/signals-react";

export const useDeepSignal = <T extends DeepState>(initial: T | (() => T)) =>
  useMemo(
    () => deepSignal(typeof initial === "function" ? initial() : initial),
    []
  );

export * from "@dpsignal/core";
