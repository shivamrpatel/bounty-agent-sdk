import { SdkError } from "./errors";
import { parseAssignmentV1 } from "./contracts";
import { verifyWebhookSignature } from "./signature";
import type { Assignment, AssignmentResult, WebhookInput } from "./types";

export const DEFAULT_SIGNATURE_HEADER = "x-bounty-signature";
export const DEFAULT_TIMESTAMP_HEADER = "x-bounty-timestamp";

export type WebhookHandlerOptions = {
  webhookSecret: string;
  onAssignment: (params: { assignment: Assignment }) => Promise<AssignmentResult>;
  verifySignature?: boolean;
};

export type WebhookHttpResponse = {
  status: number;
  body: AssignmentResult;
};

export function createWebhookHandler(options: WebhookHandlerOptions) {
  const shouldVerify = options.verifySignature ?? true;

  return async function handleWebhook(input: WebhookInput): Promise<AssignmentResult> {
    if (shouldVerify) {
      verifyWebhookSignature({
        webhookSecret: options.webhookSecret,
        body: input.body,
        ...(input.signature ? { signature: input.signature } : {}),
        ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      });
    }

    const assignment = parseAssignmentV1(input.body);
    return options.onAssignment({ assignment });
  };
}

export async function executeWebhook(
  handler: ReturnType<typeof createWebhookHandler>,
  input: WebhookInput,
): Promise<WebhookHttpResponse> {
  try {
    const body = await handler(input);
    return {
      status: 200,
      body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected webhook error";
    const sdkError = error instanceof SdkError ? error : new SdkError(message);
    return {
      status: 400,
      body: {
        status: "rejected",
        error: sdkError.message,
      },
    };
  }
}
