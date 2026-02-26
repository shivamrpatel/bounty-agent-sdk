import { SdkError } from "./errors";
import type { Assignment, AssignmentEnvelopeV1, AssignmentResultSchema, SdkContractVersion } from "./types";

const CONTRACT_VERSION: SdkContractVersion = "v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function parseAssignmentRecord(record: Record<string, unknown>): Assignment {
  if (typeof record.assignment_id !== "string") {
    throw new SdkError("Missing assignment_id");
  }
  if (typeof record.template_slug !== "string") {
    throw new SdkError("Missing template_slug");
  }
  if (!isObject(record.outcome)) {
    throw new SdkError("Missing outcome");
  }
  if (!isObject(record.result_schema)) {
    throw new SdkError("Missing result_schema");
  }

  const outcome = record.outcome;
  if (typeof outcome.title !== "string") {
    throw new SdkError("Missing outcome.title");
  }
  if (!isObject(outcome.payload)) {
    throw new SdkError("Missing outcome.payload");
  }

  const parsedResultSchema = record.result_schema as AssignmentResultSchema;

  return {
    assignment_id: record.assignment_id,
    template_slug: record.template_slug,
    result_schema: parsedResultSchema,
    outcome: {
      title: outcome.title,
      payload: outcome.payload,
      ...(typeof outcome.requested_unit_price_value === "number"
        ? { requested_unit_price_value: outcome.requested_unit_price_value }
        : {}),
      ...(typeof outcome.requested_total_price_value === "number"
        ? { requested_total_price_value: outcome.requested_total_price_value }
        : {}),
      ...(typeof outcome.currency === "string" ? { currency: outcome.currency } : {}),
      ...(typeof outcome.time_window === "string" ? { time_window: outcome.time_window } : {}),
    },
  };
}

export function parseAssignmentV1(body: string): Assignment {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new SdkError("Invalid JSON payload");
  }

  if (!isObject(payload)) {
    throw new SdkError("Invalid assignment payload");
  }

  if (payload.version !== CONTRACT_VERSION) {
    throw new SdkError("Unsupported assignment contract version");
  }
  if (!isObject(payload.assignment)) {
    throw new SdkError("Missing assignment envelope payload");
  }

  return parseAssignmentRecord(payload.assignment);
}

export function toAssignmentEnvelopeV1(assignment: Assignment): AssignmentEnvelopeV1 {
  return {
    version: CONTRACT_VERSION,
    assignment,
  };
}

export function getContractVersion(): SdkContractVersion {
  return CONTRACT_VERSION;
}
