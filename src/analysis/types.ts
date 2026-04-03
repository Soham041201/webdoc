import type { CapturedCall } from "../browser/networkRecorder.js";

export type PrimitiveType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null"
  | "unknown";

export type SpecialStringFormat =
  | "uuid"
  | "iso-date"
  | "datetime"
  | "email"
  | "url"
  | "jwt"
  | "slug"
  | "unknown";

export type SchemaKind =
  | "object"
  | "array"
  | PrimitiveType;

export interface SchemaNode {
  kind: SchemaKind;
  nullable: boolean;
  observedCount: number;
  formats?: SpecialStringFormat[];
  examples?: unknown[];
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode;
}

export interface ObservedQueryParam {
  name: string;
  values: string[];
  inferredType: PrimitiveType;
  required: boolean;
  observedCount: number;
}

export interface ObservedHeader {
  name: string;
  observedCount: number;
  sensitive: boolean;
  sampleKinds: string[];
}

export type SecuritySignalKind =
  | "auth-header"
  | "session-cookie"
  | "csrf-header"
  | "api-key"
  | "cors"
  | "security-header"
  | "sensitive-query-data"
  | "insecure-transport";

export interface SecuritySignal {
  kind: SecuritySignalKind;
  name: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface CallClassification {
  trafficType: "api" | "analytics" | "asset" | "polling" | "unknown";
  interactionType:
    | "page-load"
    | "user-triggered"
    | "background"
    | "side-effect"
    | "unknown";
  dataType:
    | "list"
    | "detail"
    | "create"
    | "update"
    | "delete"
    | "action"
    | "config"
    | "search"
    | "auth"
    | "unknown";
}

export interface WorkflowBinding {
  pageName?: string;
  pageUrl?: string;
  triggerLabel?: string;
  flowName?: string;
  stepName?: string;
}

export interface NormalizedCall {
  id: string;
  method: string;
  rawUrl: string;
  origin: string | null;
  hostname: string | null;
  pathname: string;
  normalizedPath: string;
  pathSegments: string[];
  status: number;
  queryParams: ObservedQueryParam[];
  requestHeaders: ObservedHeader[];
  responseHeaders: ObservedHeader[];
  requestSchema: SchemaNode | null;
  responseSchema: SchemaNode | null;
  requestExample: unknown | null;
  responseExample: unknown | null;
  timestamp: number;
  className?: string;
  classifications: CallClassification;
  workflow: WorkflowBinding | null;
  securitySignals: SecuritySignal[];
  raw: CapturedCall;
}

export interface EndpointGroup {
  method: string;
  normalizedPath: string;
  displayPath: string;
  operationName: string;
  resourceGroup: string;
  statuses: number[];
  origins: string[];
  queryParams: ObservedQueryParam[];
  requestHeaders: ObservedHeader[];
  responseHeaders: ObservedHeader[];
  requestSchema: SchemaNode | null;
  responseSchema: SchemaNode | null;
  requestExamples: unknown[];
  responseExamples: unknown[];
  securitySignals: SecuritySignal[];
  workflowBindings: WorkflowBinding[];
  classifications: CallClassification;
  observedCalls: number;
}

export interface CaptureAnalysis {
  calls: NormalizedCall[];
  endpoints: EndpointGroup[];
  securitySignals: SecuritySignal[];
  stats: {
    totalCalls: number;
    apiCalls: number;
    uniqueEndpoints: number;
    noisyCalls: number;
  };
}
