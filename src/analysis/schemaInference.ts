import type {
  PrimitiveType,
  SchemaKind,
  SchemaNode,
  SpecialStringFormat,
} from "./types.js";

const MAX_EXAMPLES = 3;

export function inferPrimitiveType(value: unknown): PrimitiveType {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  return "unknown";
}

export function inferStringFormat(value: string): SpecialStringFormat {
  const trimmed = value.trim();
  if (!trimmed) return "unknown";

  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
  ) {
    return "uuid";
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "email";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return "url";
  }

  if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(trimmed)) {
    return "jwt";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "iso-date";
  }

  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(
      trimmed,
    )
  ) {
    return "datetime";
  }

  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(trimmed)) {
    return "slug";
  }

  return "unknown";
}

export function inferSchema(value: unknown): SchemaNode {
  if (value === null) {
    return {
      kind: "null",
      nullable: true,
      observedCount: 1,
      examples: [null],
    };
  }

  if (Array.isArray(value)) {
    const itemSchema = value.reduce<SchemaNode | null>((acc, item) => {
      return mergeSchemas(acc, inferSchema(item));
    }, null);

    return {
      kind: "array",
      nullable: false,
      observedCount: 1,
      items: itemSchema || {
        kind: "unknown",
        nullable: true,
        observedCount: 0,
      },
      examples: value.length > 0 ? [value.slice(0, 2)] : [[]],
    };
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const properties: Record<string, SchemaNode> = {};
    const required = Object.keys(record);

    for (const [key, child] of Object.entries(record)) {
      properties[key] = inferSchema(child);
    }

    return {
      kind: "object",
      nullable: false,
      observedCount: 1,
      properties,
      required,
      examples: [value],
    };
  }

  const primitiveType = inferPrimitiveType(value);
  const schema: SchemaNode = {
    kind: primitiveType as SchemaKind,
    nullable: false,
    observedCount: 1,
    examples: [value],
  };

  if (typeof value === "string") {
    const format = inferStringFormat(value);
    if (format !== "unknown") {
      schema.formats = [format];
    }
  }

  return schema;
}

export function mergeSchemas(
  a: SchemaNode | null,
  b: SchemaNode | null,
): SchemaNode | null {
  if (!a) return cloneSchema(b);
  if (!b) return cloneSchema(a);

  if (a.kind !== b.kind) {
    return {
      kind: "unknown",
      nullable: a.nullable || b.nullable || a.kind === "null" || b.kind === "null",
      observedCount: a.observedCount + b.observedCount,
      examples: mergeExamples(a.examples, b.examples),
      formats: mergeFormats(a.formats, b.formats),
    };
  }

  if (a.kind === "object") {
    const keys = new Set([
      ...Object.keys(a.properties || {}),
      ...Object.keys(b.properties || {}),
    ]);
    const properties: Record<string, SchemaNode> = {};

    for (const key of keys) {
      properties[key] =
        mergeSchemas(a.properties?.[key] || null, b.properties?.[key] || null) || {
          kind: "unknown",
          nullable: true,
          observedCount: 0,
        };
    }

    const required = Array.from(keys).filter(
      (key) => (a.required || []).includes(key) && (b.required || []).includes(key),
    );

    return {
      kind: "object",
      nullable: a.nullable || b.nullable,
      observedCount: a.observedCount + b.observedCount,
      properties,
      required,
      examples: mergeExamples(a.examples, b.examples),
    };
  }

  if (a.kind === "array") {
    return {
      kind: "array",
      nullable: a.nullable || b.nullable,
      observedCount: a.observedCount + b.observedCount,
      items: mergeSchemas(a.items || null, b.items || null) || {
        kind: "unknown",
        nullable: true,
        observedCount: 0,
      },
      examples: mergeExamples(a.examples, b.examples),
    };
  }

  return {
    kind: a.kind,
    nullable: a.nullable || b.nullable,
    observedCount: a.observedCount + b.observedCount,
    examples: mergeExamples(a.examples, b.examples),
    formats: mergeFormats(a.formats, b.formats),
  };
}

export function parseJsonSafely(value?: string): unknown | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function mergeExamples(a?: unknown[], b?: unknown[]): unknown[] {
  const merged: unknown[] = [];
  for (const item of [...(a || []), ...(b || [])]) {
    if (merged.length >= MAX_EXAMPLES) break;
    if (!merged.some((existing) => stableStringify(existing) === stableStringify(item))) {
      merged.push(item);
    }
  }
  return merged;
}

function mergeFormats(
  a?: SpecialStringFormat[],
  b?: SpecialStringFormat[],
): SpecialStringFormat[] | undefined {
  const merged = Array.from(new Set([...(a || []), ...(b || [])])).filter(
    (format) => format !== "unknown",
  );
  return merged.length > 0 ? merged : undefined;
}

function cloneSchema(schema: SchemaNode | null): SchemaNode | null {
  if (!schema) return null;
  return {
    ...schema,
    formats: schema.formats ? [...schema.formats] : undefined,
    examples: schema.examples ? [...schema.examples] : undefined,
    required: schema.required ? [...schema.required] : undefined,
    items: cloneSchema(schema.items || null) || undefined,
    properties: schema.properties
      ? Object.fromEntries(
          Object.entries(schema.properties).map(([key, value]) => [
            key,
            cloneSchema(value) as SchemaNode,
          ]),
        )
      : undefined,
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(",")}}`;
}
