import type { ApiErrorBody } from "./types";

export class SdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SdkError";
  }
}

export class ApiError extends SdkError {
  readonly status: number;
  readonly code: string | undefined;
  readonly body: ApiErrorBody | null;
  readonly retryable: boolean;

  constructor(params: {
    status: number;
    message: string;
    code: string | undefined;
    body: ApiErrorBody | null;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.body = params.body;
    this.retryable = params.status === 429 || params.status >= 500;
  }
}
