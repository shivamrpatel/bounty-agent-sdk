import {
  verifyWebhook,
  type AgentEvent,
} from "@bounty-ai/agent-sdk";

export interface RawAgentOptions {
  webhookSecret: string | readonly string[];
  dispatch(input: { event: AgentEvent }): Promise<void>;
}

export function createBountyWebhookReceiver(options: RawAgentOptions) {
  return async function receiveBountyWebhook(request: Request) {
    const event = await verifyWebhook(request, {
      secret: options.webhookSecret,
    });

    await options.dispatch({ event });
    return new Response(null, { status: 202 });
  };
}
