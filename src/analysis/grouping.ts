import { mergeSchemas } from "./schemaInference.js";
import type {
  CallClassification,
  EndpointGroup,
  NormalizedCall,
  ObservedHeader,
  ObservedQueryParam,
  SecuritySignal,
  WorkflowBinding,
} from "./types.js";

export function groupCallsIntoEndpoints(calls: NormalizedCall[]): EndpointGroup[] {
  const groups = new Map<string, EndpointAccumulator>();

  for (const call of calls) {
    if (call.classifications.trafficType !== "api" && call.classifications.trafficType !== "polling") {
      continue;
    }

    const key = `${call.method} ${call.normalizedPath}`;
    const existing = groups.get(key) || createAccumulator(call);
    mergeIntoAccumulator(existing, call);
    groups.set(key, existing);
  }

  return Array.from(groups.values())
    .map(finalizeAccumulator)
    .sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath) || a.method.localeCompare(b.method));
}

export function mergeQueryParams(
  a: ObservedQueryParam[],
  b: ObservedQueryParam[],
): ObservedQueryParam[] {
  const map = new Map<string, ObservedQueryParam>();

  for (const param of [...a, ...b]) {
    const existing = map.get(param.name);
    if (!existing) {
      map.set(param.name, {
        ...param,
        values: [...param.values],
      });
      continue;
    }

    existing.values = Array.from(new Set([...existing.values, ...param.values])).slice(0, 5);
    existing.observedCount += param.observedCount;
    existing.required = existing.required && param.required;
    if (existing.inferredType !== param.inferredType) {
      existing.inferredType = "string";
    }
  }

  return Array.from(map.values()).sort((x, y) => x.name.localeCompare(y.name));
}

export function mergeHeaders(a: ObservedHeader[], b: ObservedHeader[]): ObservedHeader[] {
  const map = new Map<string, ObservedHeader>();

  for (const header of [...a, ...b]) {
    const key = header.name.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...header,
        sampleKinds: [...header.sampleKinds],
      });
      continue;
    }

    existing.observedCount += header.observedCount;
    existing.sensitive = existing.sensitive || header.sensitive;
    existing.sampleKinds = Array.from(new Set([...existing.sampleKinds, ...header.sampleKinds]));
  }

  return Array.from(map.values()).sort((x, y) => x.name.localeCompare(y.name));
}

export function buildOperationName(
  method: string,
  normalizedPath: string,
  classifications: CallClassification,
): string {
  const resource = inferResourceGroup(normalizedPath);
  const singular = resource.endsWith("s") ? resource.slice(0, -1) : resource;

  switch (classifications.dataType) {
    case "list":
      return `list${pascalCase(resource)}`;
    case "detail":
      return `get${pascalCase(singular)}`;
    case "create":
      return `create${pascalCase(singular)}`;
    case "update":
      return `update${pascalCase(singular)}`;
    case "delete":
      return `delete${pascalCase(singular)}`;
    case "search":
      return `search${pascalCase(resource)}`;
    case "auth":
      return `${method.toLowerCase()}AuthAction`;
    case "config":
      return `get${pascalCase(resource)}Config`;
    default:
      return `${method.toLowerCase()}${pascalCase(normalizedPath.replace(/[{}]/g, "").replace(/\//g, " "))}`;
  }
}

export function inferResourceGroup(normalizedPath: string): string {
  const segments = normalizedPath.split("/").filter(Boolean);
  const firstConcrete = segments.find((segment) => !segment.startsWith("{"));
  return firstConcrete || "root";
}

interface EndpointAccumulator {
  method: string;
  normalizedPath: string;
  displayPath: string;
  resourceGroup: string;
  statuses: Set<number>;
  origins: Set<string>;
  queryParams: ObservedQueryParam[];
  requestHeaders: ObservedHeader[];
  responseHeaders: ObservedHeader[];
  requestSchema: EndpointGroup["requestSchema"];
  responseSchema: EndpointGroup["responseSchema"];
  requestExamples: unknown[];
  responseExamples: unknown[];
  securitySignals: SecuritySignal[];
  workflowBindings: WorkflowBinding[];
  classifications: CallClassification;
  observedCalls: number;
}

function createAccumulator(call: NormalizedCall): EndpointAccumulator {
  return {
    method: call.method,
    normalizedPath: call.normalizedPath,
    displayPath: call.normalizedPath,
    resourceGroup: inferResourceGroup(call.normalizedPath),
    statuses: new Set<number>(),
    origins: new Set<string>(),
    queryParams: [],
    requestHeaders: [],
    responseHeaders: [],
    requestSchema: null,
    responseSchema: null,
    requestExamples: [],
    responseExamples: [],
    securitySignals: [],
    workflowBindings: [],
    classifications: call.classifications,
    observedCalls: 0,
  };
}

function mergeIntoAccumulator(acc: EndpointAccumulator, call: NormalizedCall): void {
  acc.statuses.add(call.status);
  if (call.origin) acc.origins.add(call.origin);
  acc.queryParams = mergeQueryParams(acc.queryParams, call.queryParams);
  acc.requestHeaders = mergeHeaders(acc.requestHeaders, call.requestHeaders);
  acc.responseHeaders = mergeHeaders(acc.responseHeaders, call.responseHeaders);
  acc.requestSchema = mergeSchemas(acc.requestSchema, call.requestSchema);
  acc.responseSchema = mergeSchemas(acc.responseSchema, call.responseSchema);
  acc.securitySignals = mergeSignals(acc.securitySignals, call.securitySignals);
  acc.workflowBindings = mergeWorkflowBindings(acc.workflowBindings, call.workflow);
  acc.requestExamples = mergeExamples(acc.requestExamples, call.requestExample);
  acc.responseExamples = mergeExamples(acc.responseExamples, call.responseExample);
  acc.observedCalls += 1;
}

function finalizeAccumulator(acc: EndpointAccumulator): EndpointGroup {
  return {
    method: acc.method,
    normalizedPath: acc.normalizedPath,
    displayPath: acc.displayPath,
    operationName: buildOperationName(acc.method, acc.normalizedPath, acc.classifications),
    resourceGroup: acc.resourceGroup,
    statuses: Array.from(acc.statuses).sort((a, b) => a - b),
    origins: Array.from(acc.origins).sort(),
    queryParams: acc.queryParams,
    requestHeaders: acc.requestHeaders,
    responseHeaders: acc.responseHeaders,
    requestSchema: acc.requestSchema,
    responseSchema: acc.responseSchema,
    requestExamples: acc.requestExamples,
    responseExamples: acc.responseExamples,
    securitySignals: acc.securitySignals,
    workflowBindings: acc.workflowBindings,
    classifications: acc.classifications,
    observedCalls: acc.observedCalls,
  };
}

function mergeSignals(existing: SecuritySignal[], incoming: SecuritySignal[]): SecuritySignal[] {
  const map = new Map<string, SecuritySignal>();
  for (const signal of [...existing, ...incoming]) {
    map.set(`${signal.kind}:${signal.name}:${signal.description}`, signal);
  }
  return Array.from(map.values());
}

function mergeWorkflowBindings(
  existing: WorkflowBinding[],
  incoming: WorkflowBinding | null,
): WorkflowBinding[] {
  if (!incoming) return existing;
  const key = JSON.stringify(incoming);
  const seen = new Set(existing.map((item) => JSON.stringify(item)));
  if (seen.has(key)) return existing;
  return [...existing, incoming];
}

function mergeExamples(existing: unknown[], incoming: unknown | null): unknown[] {
  if (incoming === null || incoming === undefined) return existing;
  const serialized = new Set(existing.map(stableStringify));
  const next = stableStringify(incoming);
  if (serialized.has(next)) return existing;
  return [...existing, incoming].slice(0, 3);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(",")}}`;
}

function pascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}
