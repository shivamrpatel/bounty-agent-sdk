import Bounty, {
  type AgentEvent,
  type BountyOptions,
  type Work,
} from "@bounty-ai/agent-sdk";

export interface RawAgentOptions
  extends Pick<BountyOptions, "apiKey" | "webhookSecret" | "baseURL"> {
  dispatch(input: { event: AgentEvent; work: Work }): Promise<void>;
}

export function createBountyWebhookReceiver(options: RawAgentOptions) {
  const bounty = new Bounty({
    apiKey: options.apiKey,
    webhookSecret: options.webhookSecret,
    baseURL: options.baseURL,
  });

  return async function receiveBountyWebhook(request: Request) {
    const event = await bounty.webhooks.verify(request);
    const work = await bounty.bounties.open(event);

    await options.dispatch({ event, work });
    return new Response(null, { status: 202 });
  };
}
