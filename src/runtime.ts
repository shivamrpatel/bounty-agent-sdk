import { AgentClient, type ClientOptions } from "./client";
import { SdkError } from "./errors";
import type {
  Assignment,
  AssignmentAction,
  AssignmentResult,
  SubmitErrorRequest,
  SubmitResultRequest,
} from "./types";

type RuntimeLogger = {
  info?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
};

export type AutoSubmitAssignmentHandlerOptions = {
  client: AgentClient | ClientOptions;
  runAssignment: (params: { assignment: Assignment }) => Promise<AssignmentExecutionOutput>;
  acceptAssignment?: (params: { assignment: Assignment }) => Promise<AssignmentResult> | AssignmentResult;
  createSubmitRequest?: (params: {
    assignment: Assignment;
    result: Record<string, unknown>;
    actions?: AssignmentAction[];
  }) => SubmitResultRequest;
  createSubmitErrorRequest?: (params: { assignment: Assignment; error: unknown }) => SubmitErrorRequest;
  executionMode?: "background" | "blocking";
  logger?: RuntimeLogger;
};

export type AssignmentExecutionResult = {
  result: Record<string, unknown>;
  actions?: AssignmentAction[];
};

export type AssignmentExecutionOutput = Record<string, unknown> | AssignmentExecutionResult;

export type AssignmentExecutionHandler = (
  params: { assignment: Assignment },
) => Promise<AssignmentExecutionOutput>;

export type AssignmentSlugRouterOptions = {
  handlers: Record<string, AssignmentExecutionHandler>;
  fallback?: AssignmentExecutionHandler;
  normalizeSlug?: (slug: string) => string;
};

function toMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Unknown assignment execution error";
}

function defaultAcceptedResponse(assignment: Assignment): AssignmentResult {
  return {
    status: "assigned",
    result: {
      accepted: true,
      assignment_id: assignment.assignment_id,
    },
  };
}

function defaultSubmitRequest(params: {
  assignment: Assignment;
  result: Record<string, unknown>;
  actions?: AssignmentAction[];
}): SubmitResultRequest {
  return {
    assignmentId: params.assignment.assignment_id,
    status: "verifying",
    result: params.result,
    ...(params.actions && params.actions.length > 0 ? { actions: params.actions } : {}),
  };
}

function defaultSubmitErrorRequest(params: { assignment: Assignment; error: unknown }): SubmitErrorRequest {
  return {
    assignmentId: params.assignment.assignment_id,
    error: toMessage(params.error),
  };
}

function asClient(client: AgentClient | ClientOptions) {
  return client instanceof AgentClient ? client : new AgentClient(client);
}

function normalizeExecutionOutput(output: AssignmentExecutionOutput): AssignmentExecutionResult {
  if (
    output &&
    typeof output === "object" &&
    !Array.isArray(output) &&
    "result" in output &&
    output.result &&
    typeof output.result === "object" &&
    !Array.isArray(output.result)
  ) {
    const actions =
      "actions" in output && Array.isArray(output.actions)
        ? (output.actions as AssignmentAction[])
        : undefined;
    return {
      result: output.result as Record<string, unknown>,
      ...(actions && actions.length > 0 ? { actions } : {}),
    };
  }

  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new SdkError("Assignment execution must return an object result");
  }

  return {
    result: output as Record<string, unknown>,
  };
}

export function createAssignmentSlugRouter(options: AssignmentSlugRouterOptions): AssignmentExecutionHandler {
  const normalize = options.normalizeSlug ?? ((slug: string) => slug);
  const normalizedHandlers = new Map<string, AssignmentExecutionHandler>();

  for (const [slug, handler] of Object.entries(options.handlers)) {
    normalizedHandlers.set(normalize(slug), handler);
  }

  return async ({ assignment }) => {
    const slug = normalize(assignment.template_slug);
    const handler = normalizedHandlers.get(slug) ?? options.fallback;
    if (!handler) {
      throw new SdkError(`No assignment handler registered for template slug "${assignment.template_slug}"`);
    }
    return handler({ assignment });
  };
}

export function createAutoSubmitAssignmentHandler(options: AutoSubmitAssignmentHandlerOptions) {
  const client = asClient(options.client);
  const mode = options.executionMode ?? "background";
  const logger = options.logger;

  async function processAssignment(assignment: Assignment) {
    try {
      const execution = normalizeExecutionOutput(await options.runAssignment({ assignment }));
      const submitRequest = options.createSubmitRequest
        ? options.createSubmitRequest({
            assignment,
            result: execution.result,
            ...(execution.actions ? { actions: execution.actions } : {}),
          })
        : defaultSubmitRequest({
            assignment,
            result: execution.result,
            ...(execution.actions ? { actions: execution.actions } : {}),
          });
      await client.submitResult(submitRequest);
      logger?.info?.("[agent-sdk] assignment_submitted", {
        assignmentId: assignment.assignment_id,
        status: submitRequest.status,
        actionCount: submitRequest.actions?.length ?? 0,
      });
    } catch (error) {
      const submitErrorRequest = options.createSubmitErrorRequest
        ? options.createSubmitErrorRequest({ assignment, error })
        : defaultSubmitErrorRequest({ assignment, error });
      await client.submitError(submitErrorRequest);
      logger?.error?.("[agent-sdk] assignment_failed", {
        assignmentId: assignment.assignment_id,
        error: submitErrorRequest.error,
      });
    }
  }

  return async function onAssignment({ assignment }: { assignment: Assignment }): Promise<AssignmentResult> {
    const accepted = options.acceptAssignment
      ? await options.acceptAssignment({ assignment })
      : defaultAcceptedResponse(assignment);

    if (accepted.status !== "assigned") {
      return accepted;
    }

    if (mode === "blocking") {
      await processAssignment(assignment);
    } else {
      void processAssignment(assignment).catch((error) => {
        logger?.error?.("[agent-sdk] assignment_background_failure", {
          assignmentId: assignment.assignment_id,
          error: toMessage(error),
        });
      });
    }

    return accepted;
  };
}
