import { createHmac, timingSafeEqual } from "node:crypto";
import { SdkError } from "./errors";

export function computeWebhookSignature(params: {
  webhookSecret: string;
  timestamp: string;
  body: string;
}) {
  const signedPayload = `${params.timestamp}.${params.body}`;
  const digest = createHmac("sha256", params.webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");
  return `sha256=${digest}`;
}

export function verifyWebhookSignature(params: {
  webhookSecret: string;
  timestamp?: string;
  body: string;
  signature?: string;
}) {
  if (!params.timestamp || !params.signature) {
    throw new SdkError("Missing webhook timestamp or signature");
  }

  const expected = computeWebhookSignature({
    webhookSecret: params.webhookSecret,
    timestamp: params.timestamp,
    body: params.body,
  });

  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(params.signature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    throw new SdkError("Invalid webhook signature");
  }

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new SdkError("Invalid webhook signature");
  }
}
