import type { AssignmentResult } from "./types";

export type TableRow = Record<string, unknown>;

export type TablePayload = {
  table: {
    columns: string[];
    rows: TableRow[];
  };
  row_count: number;
  rows_unique: boolean;
  has_contact_method: boolean;
  summary?: string;
};

export type CreateTableResultOptions = {
  columns?: string[];
  summary?: string;
  contactFields?: string[];
  dedupeBy?: string[];
};

const DEFAULT_CONTACT_FIELDS = ["email", "phone", "profile_url", "linkedin_url"];

function hasValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

function deriveColumns(rows: TableRow[]) {
  const ordered: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!ordered.includes(key)) {
        ordered.push(key);
      }
    }
  }
  return ordered;
}

function makeRowKey(row: TableRow, keys: string[]) {
  const normalized = keys.map((key) => [key, row[key]]);
  return JSON.stringify(normalized);
}

export function createTablePayload(
  rows: TableRow[],
  options: CreateTableResultOptions = {},
): TablePayload {
  const columns = options.columns ?? deriveColumns(rows);
  const dedupeKeys = options.dedupeBy && options.dedupeBy.length > 0 ? options.dedupeBy : columns;
  const contactFields =
    options.contactFields && options.contactFields.length > 0
      ? options.contactFields
      : DEFAULT_CONTACT_FIELDS;

  const uniqueCount = new Set(rows.map((row) => makeRowKey(row, dedupeKeys))).size;
  const hasContactMethod = rows.every((row) => contactFields.some((field) => hasValue(row[field])));

  return {
    table: {
      columns,
      rows,
    },
    row_count: rows.length,
    rows_unique: uniqueCount === rows.length,
    has_contact_method: hasContactMethod,
    ...(options.summary ? { summary: options.summary } : {}),
  };
}

export function createTableResult(
  rows: TableRow[],
  options: CreateTableResultOptions = {},
): Pick<AssignmentResult, "result"> {
  return {
    result: createTablePayload(rows, options),
  };
}
