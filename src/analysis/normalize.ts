import type { CapturedCall } from "../browser/networkRecorder.js";
import { inferPrimitiveType, inferSchema, parseJsonSafely } from "./schemaInference.js";
import { extractSecuritySignals, normalizeHeaders } from "./security.js";
import type {
  CallClassification,
  NormalizedCall,
  ObservedQueryParam,
  WorkflowBinding,
} from "./types.js";

export function normalizeCapturedCalls(
  calls: CapturedCall[],
  workflowBindings: WorkflowBinding[] = [],
): NormalizedCall[] {
  return calls.map((call, index) =>
    normalizeCapturedCall(call, workflowBindings[index] || null, index),
  );
}

export function normalizeCapturedCall(
  call: CapturedCall,
  workflow: WorkflowBinding | null = null,
  index = 0,
): NormalizedCall {
  const parsed = safeParseUrl(call.url);
  const pathname = parsed?.pathname || call.url;
  const normalizedPath = normalizePath(pathname);
  const requestExample = parseJsonSafely(call.requestBody);
  const responseExample = parseJsonSafely(call.responseBody);

  return {
    id: buildCallId(call, index),
    method: call.method.toUpperCase(),
    rawUrl: call.url,
    origin: parsed?.origin || null,
    hostname: parsed?.hostname || null,
    pathname,
    normalizedPath,
    pathSegments: pathname.split("/").filter(Boolean),
    status: call.status,
    queryParams: extractQueryParams(parsed),
    requestHeaders: normalizeHeaders(call.requestHeaders || {}),
    responseHeaders: normalizeHeaders(call.responseHeaders || {}),
    requestSchema: requestExample !== null ? inferSchema(requestExample) : null,
    responseSchema: responseExample !== null ? inferSchema(responseExample) : null,
    requestExample,
    responseExample,
    timestamp: call.timestamp,
    classifications: classifyCall(call, parsed?.pathname || call.url),
    workflow,
    securitySignals: extractSecuritySignals(call),
    raw: call,
  };
}

export function normalizePath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  const normalized = segments.map((segment) => inferPathSegmentKind(segment));
  return `/${normalized.join("/")}`;
}

export function inferPathSegmentKind(segment: string): string {
  if (/^\d+$/.test(segment)) {
    return "{id}";
  }

  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      segment,
    )
  ) {
    return "{id}";
  }

  if (/^[A-Za-z0-9-_]{20,}$/.test(segment)) {
    return "{token}";
  }

  return segment;
}

function extractQueryParams(parsed: URL | null): ObservedQueryParam[] {
  if (!parsed) return [];

  const values = new Map<string, string[]>();
  for (const [key, value] of parsed.searchParams.entries()) {
    const existing = values.get(key) || [];
    if (!existing.includes(value)) {
      existing.push(value);
    }
    values.set(key, existing);
  }

  return Array.from(values.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rawValues]) => ({
      name,
      values: rawValues.slice(0, 5),
      inferredType: inferQueryParamType(rawValues),
      required: true,
      observedCount: rawValues.length,
    }));
}

function inferQueryParamType(values: string[]) {
  if (values.length === 0) return "unknown" as const;
  const inferred = values.map((value) => inferPrimitiveTypeFromString(value));
  const first = inferred[0];
  return inferred.every((item) => item === first) ? first : "string";
}

function inferPrimitiveTypeFromString(value: string) {
  if (value === "true" || value === "false") return "boolean" as const;
  if (/^-?\d+$/.test(value)) return "integer" as const;
  if (/^-?\d+\.\d+$/.test(value)) return "number" as const;
  return inferPrimitiveType(value);
}

function classifyCall(call: CapturedCall, pathname: string): CallClassification {
  const lowerUrl = call.url.toLowerCase();
  const method = call.method.toUpperCase();

  const trafficType = /analytics|segment|amplitude|mixpanel|telemetry|metrics/.test(lowerUrl)
    ? "analytics"
    : /poll|heartbeat|ping/.test(lowerUrl)
      ? "polling"
      : "api";

  let dataType: CallClassification["dataType"] = "unknown";
  if (/auth|login|logout|register|session/.test(lowerUrl)) {
    dataType = "auth";
  } else if (method === "POST") {
    dataType = "create";
  } else if (method === "PATCH" || method === "PUT") {
    dataType = "update";
  } else if (method === "DELETE") {
    dataType = "delete";
  } else if (/search|query|filter/.test(lowerUrl)) {
    dataType = "search";
  } else if (/config|settings/.test(lowerUrl)) {
    dataType = "config";
  } else if (method === "GET") {
    dataType = /\{id\}|\/[^/]+$/.test(normalizePath(pathname)) ? "detail" : "list";
  }

  return {
    trafficType,
    interactionType: trafficType === "polling" ? "background" : "unknown",
    dataType,
  };
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function buildCallId(call: CapturedCall, index: number): string {
  return `${call.method.toUpperCase()}:${call.url}:${call.timestamp}:${index}`;
}
