import { BountyConfigurationError, BountyWebhookError } from "../errors.js";
import { agentEventEnvelopeSchema } from "../runtime-schemas.js";
import type {
  AgentEvent,
  VerifyWebhookOptions,
} from "../types.js";
import { z } from "zod";

const webhookSignaturePattern = /^v1,[A-Za-z0-9+/]+={0,2}$/;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const defaultMaxBodyBytes = 1024 * 1024;
const webhookSecretsSchema = z.union([
  z.string().min(1).transform((secret) => [secret]),
  z.array(z.string().min(1)).min(1),
]);

export class WebhooksResource {
  readonly #configuredSecrets: string | readonly string[] | undefined;

  constructor(configuredSecrets?: string | readonly string[]) {
    this.#configuredSecrets = configuredSecrets;
  }

  async verify(
    request: Request,
    options: VerifyWebhookOptions = {},
  ): Promise<AgentEvent> {
    const webhookId = request.headers.get("webhook-id");
    const webhookTimestamp = request.headers.get("webhook-timestamp");
    const webhookSignature = request.headers.get("webhook-signature");
    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      throw new BountyWebhookError(
        "missing_header",
        "Bounty webhook headers are missing",
      );
    }
    if (!/^[0-9]+$/.test(webhookTimestamp)) {
      throw new BountyWebhookError(
        "invalid_timestamp",
        "Bounty webhook timestamp is invalid",
      );
    }

    const timestamp = Number(webhookTimestamp);
    const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
    const tolerance = options.toleranceSeconds ?? 300;
    const maxBodyBytes = options.maxBodyBytes ?? defaultMaxBodyBytes;
    if (!Number.isFinite(now)) {
      throw new BountyConfigurationError("nowSeconds must be finite");
    }
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new BountyConfigurationError(
        "toleranceSeconds must be finite and nonnegative",
      );
    }
    if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes <= 0) {
      throw new BountyConfigurationError(
        "maxBodyBytes must be a positive safe integer",
      );
    }
    if (
      !Number.isSafeInteger(timestamp) ||
      Math.abs(now - timestamp) > tolerance
    ) {
      throw new BountyWebhookError(
        "timestamp_out_of_tolerance",
        "Bounty webhook timestamp is outside the allowed tolerance",
      );
    }
    if (!webhookSignaturePattern.test(webhookSignature)) {
      throw new BountyWebhookError(
        "invalid_signature_format",
        "Bounty webhook signature has an invalid format",
      );
    }

    const configured = options.secret ?? this.#configuredSecrets;
    if (!configured) {
      throw new BountyConfigurationError(
        "A webhook secret is required to verify Bounty webhooks",
      );
    }
    const parsedSecrets = webhookSecretsSchema.safeParse(configured);
    if (!parsedSecrets.success) {
      throw new BountyConfigurationError(
        "At least one webhook secret is required",
      );
    }
    const secrets = parsedSecrets.data;

    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
      throw new BountyWebhookError(
        "payload_too_large",
        `Bounty webhook body exceeds ${maxBodyBytes} bytes`,
      );
    }

    const chunks: Uint8Array[] = [];
    let bodyLength = 0;
    const reader = request.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bodyLength += value.byteLength;
        if (bodyLength > maxBodyBytes) {
          await reader.cancel();
          throw new BountyWebhookError(
            "payload_too_large",
            `Bounty webhook body exceeds ${maxBodyBytes} bytes`,
          );
        }
        chunks.push(value);
      }
    }
    const rawBody = new Uint8Array(bodyLength);
    let bodyOffset = 0;
    for (const chunk of chunks) {
      rawBody.set(chunk, bodyOffset);
      bodyOffset += chunk.byteLength;
    }
    const signature = this.#decodeBase64(webhookSignature.slice(3));
    if (!signature) {
      throw new BountyWebhookError(
        "invalid_signature_format",
        "Bounty webhook signature is not valid base64",
      );
    }
    const signedInput = this.#signedInput(
      webhookId,
      webhookTimestamp,
      rawBody,
    );
    let verified = false;
    for (const secret of secrets) {
      try {
        const key = await crypto.subtle.importKey(
          "raw",
          Uint8Array.from(this.#secretBytes(secret)).buffer,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["verify"],
        );
        if (
          await crypto.subtle.verify(
            "HMAC",
            key,
            Uint8Array.from(signature).buffer,
            signedInput,
          )
        ) {
          verified = true;
        }
      } catch {
        // Try every configured secret to support rotation.
      }
    }
    if (!verified) {
      throw new BountyWebhookError(
        "invalid_signature",
        "Bounty webhook signature verification failed",
      );
    }

    let value: unknown;
    try {
      value = JSON.parse(textDecoder.decode(rawBody));
    } catch {
      throw new BountyWebhookError(
        "invalid_event",
        "Bounty webhook body is not valid JSON",
      );
    }
    const parsed = agentEventEnvelopeSchema.safeParse(value);
    if (!parsed.success) {
      throw new BountyWebhookError(
        "invalid_event",
        "Bounty webhook body is not a valid Agent event",
      );
    }
    if (parsed.data.id !== webhookId) {
      throw new BountyWebhookError(
        "event_id_mismatch",
        "Bounty webhook header and body event IDs do not match",
      );
    }
    return parsed.data;
  }

  #secretBytes(secret: string) {
    const encoded = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    return this.#decodeBase64(encoded) ?? textEncoder.encode(encoded);
  }

  #decodeBase64(value: string) {
    try {
      const binary = atob(value);
      return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
      return undefined;
    }
  }

  #signedInput(eventId: string, timestamp: string, rawBody: Uint8Array) {
    const prefix = textEncoder.encode(`${eventId}.${timestamp}.`);
    const input = new Uint8Array(prefix.byteLength + rawBody.byteLength);
    input.set(prefix);
    input.set(rawBody, prefix.byteLength);
    return input.buffer;
  }
}
