import { WebhooksResource } from "./resources/webhooks.js";
import type { AgentEvent, VerifyWebhookOptions } from "./types.js";

export type VerifyBountyWebhookOptions = Omit<VerifyWebhookOptions, "secret"> & {
  secret: string | readonly string[];
};

/** Verify one signed Bounty webhook without constructing an API client. */
export function verifyWebhook(
  request: Request,
  options: VerifyBountyWebhookOptions,
): Promise<AgentEvent> {
  return new WebhooksResource().verify(request, options);
}
