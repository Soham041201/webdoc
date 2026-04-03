import type { CapturedCall } from "../browser/networkRecorder.js";
import type { ObservedHeader, SecuritySignal } from "./types.js";

const SENSITIVE_HEADER_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /token/i,
  /api[-_]?key/i,
  /secret/i,
];

export function extractSecuritySignals(call: CapturedCall): SecuritySignal[] {
  const signals: SecuritySignal[] = [];
  const requestHeaders = call.requestHeaders || {};
  const responseHeaders = call.responseHeaders || {};

  for (const key of Object.keys(requestHeaders)) {
    const lower = key.toLowerCase();
    if (lower === "authorization") {
      signals.push({
        kind: "auth-header",
        name: key,
        description: "Authorization header observed on request.",
        severity: "medium",
      });
    }
    if (lower.includes("csrf") || lower.includes("xsrf")) {
      signals.push({
        kind: "csrf-header",
        name: key,
        description: "CSRF/XSRF protection header observed.",
        severity: "medium",
      });
    }
    if (lower.includes("api-key") || lower === "x-api-key") {
      signals.push({
        kind: "api-key",
        name: key,
        description: "API key style header observed.",
        severity: "high",
      });
    }
    if (lower === "cookie") {
      signals.push({
        kind: "session-cookie",
        name: key,
        description: "Cookie-based session or tracking header observed.",
        severity: "medium",
      });
    }
  }

  for (const key of Object.keys(responseHeaders)) {
    const lower = key.toLowerCase();
    if (lower.startsWith("access-control-allow-")) {
      signals.push({
        kind: "cors",
        name: key,
        description: "CORS response header observed.",
        severity: "low",
      });
    }
    if (
      lower === "strict-transport-security" ||
      lower === "content-security-policy" ||
      lower === "x-frame-options" ||
      lower === "x-content-type-options"
    ) {
      signals.push({
        kind: "security-header",
        name: key,
        description: "Security-related response header observed.",
        severity: "low",
      });
    }
  }

  try {
    const url = new URL(call.url);
    if (url.protocol === "http:") {
      signals.push({
        kind: "insecure-transport",
        name: "protocol",
        description: "Request used insecure HTTP transport.",
        severity: "high",
      });
    }

    for (const [name] of url.searchParams.entries()) {
      if (/(token|email|password|secret|auth|key)/i.test(name)) {
        signals.push({
          kind: "sensitive-query-data",
          name,
          description: "Potentially sensitive query parameter observed.",
          severity: "high",
        });
      }
    }
  } catch {
    // ignore malformed URLs
  }

  return mergeSecuritySignals(signals);
}

export function mergeSecuritySignals(signals: SecuritySignal[]): SecuritySignal[] {
  const deduped = new Map<string, SecuritySignal>();
  for (const signal of signals) {
    const key = `${signal.kind}:${signal.name}:${signal.description}`;
    const existing = deduped.get(key);
    if (!existing || severityWeight(signal.severity) > severityWeight(existing.severity)) {
      deduped.set(key, signal);
    }
  }
  return Array.from(deduped.values());
}

export function isSensitiveHeader(name: string): boolean {
  return SENSITIVE_HEADER_PATTERNS.some((pattern) => pattern.test(name));
}

export function normalizeHeaders(
  headers: Record<string, string>,
): ObservedHeader[] {
  return Object.keys(headers || {})
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      observedCount: 1,
      sensitive: isSensitiveHeader(name),
      sampleKinds: [classifyHeaderValue(headers[name])],
    }));
}

function classifyHeaderValue(value: string | undefined): string {
  if (!value) return "empty";
  if (/^bearer\s+/i.test(value)) return "bearer-token";
  if (value.includes(";")) return "compound";
  if (/^[0-9]+$/.test(value)) return "integer-like";
  if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
    return "jwt-like";
  }
  return "string";
}

function severityWeight(severity: SecuritySignal["severity"]): number {
  switch (severity) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}
