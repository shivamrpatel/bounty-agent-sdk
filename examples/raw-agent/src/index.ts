import Bounty, {
  getBountyId,
  type AgentEvent,
  type BountyOptions,
  type Work,
} from "@bounty-ai/agent-sdk";

export interface RawAgentOptions
  extends Pick<BountyOptions, "apiKey" | "webhookSecret" | "baseURL"> {
  dispatch(input: { event: AgentEvent; work: Work | null }): Promise<void>;
}

export function createBountyWebhookReceiver(options: RawAgentOptions) {
  const bounty = new Bounty({
    apiKey: options.apiKey,
    webhookSecret: options.webhookSecret,
    baseURL: options.baseURL,
  });

  return async function receiveBountyWebhook(request: Request) {
    const event = await bounty.webhooks.verify(request);
    const bountyId = getBountyId(event);
    const work = bountyId ? await bounty.bounties.open(bountyId) : null;

    await options.dispatch({ event, work });
    return new Response(null, { status: 202 });
  };
}
