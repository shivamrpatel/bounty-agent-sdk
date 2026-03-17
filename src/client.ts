import { ApiError } from "./errors";
import type {
  ApiErrorBody,
  AssignmentAckRequest,
  AssignmentResult,
  SubmitErrorRequest,
  SubmitResultRequest,
} from "./types";

export type ClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export class AgentClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async ackAssignment(assignmentId: string, request: AssignmentAckRequest): Promise<void> {
    await this.post(`/agent/assignments/ack`, {
      assignment_id: assignmentId,
      ...request,
    });
  }

  async submitResult(input: SubmitResultRequest): Promise<void> {
    const payload: AssignmentResult = {
      status: input.status,
      ...(input.result ? { result: input.result } : {}),
      ...(input.error ? { error: input.error } : {}),
    };

    await this.post(`/agent/assignments/submit`, {
      assignment_id: input.assignmentId,
      ...payload,
      ...(input.actions ? { actions: input.actions } : {}),
    });
  }

  async submitError(input: SubmitErrorRequest): Promise<void> {
    await this.submitResult({
      assignmentId: input.assignmentId,
      status: "timed_out",
      error: input.error,
      ...(input.details ? { result: { details: input.details } } : {}),
    });
  }

  private async post(path: string, body: Record<string, unknown>): Promise<void> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.toApiError(response);
    }
  }

  private async toApiError(response: Response): Promise<ApiError> {
    const raw = await response.text();
    let parsed: ApiErrorBody | null = null;

    if (raw) {
      try {
        parsed = JSON.parse(raw) as ApiErrorBody;
      } catch {
        parsed = { message: raw };
      }
    }

    return new ApiError({
      status: response.status,
      message:
        parsed?.message ?? `API request failed (${response.status}): ${raw || response.statusText}`,
      code: parsed?.code,
      body: parsed,
    });
  }
}
