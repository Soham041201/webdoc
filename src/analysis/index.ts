import type { CapturedCall } from "../browser/networkRecorder.js";
import { groupCallsIntoEndpoints } from "./grouping.js";
import { normalizeCapturedCalls } from "./normalize.js";
import type { CaptureAnalysis, WorkflowBinding } from "./types.js";

export * from "./types.js";
export * from "./schemaInference.js";
export * from "./normalize.js";
export * from "./grouping.js";
export * from "./security.js";

export function analyzeCapturedCalls(
  calls: CapturedCall[],
  workflowBindings: WorkflowBinding[] = [],
): CaptureAnalysis {
  const normalizedCalls = normalizeCapturedCalls(calls, workflowBindings);
  const endpoints = groupCallsIntoEndpoints(normalizedCalls);
  const securitySignals = Array.from(
    new Map(
      normalizedCalls
        .flatMap((call) => call.securitySignals)
        .map((signal) => [`${signal.kind}:${signal.name}:${signal.description}`, signal]),
    ).values(),
  );

  return {
    calls: normalizedCalls,
    endpoints,
    securitySignals,
    stats: {
      totalCalls: normalizedCalls.length,
      apiCalls: normalizedCalls.filter(
        (call) => call.classifications.trafficType === "api" || call.classifications.trafficType === "polling",
      ).length,
      uniqueEndpoints: endpoints.length,
      noisyCalls: normalizedCalls.filter((call) => call.classifications.trafficType !== "api").length,
    },
  };
}
