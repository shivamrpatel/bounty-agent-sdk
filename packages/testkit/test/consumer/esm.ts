import Bounty, { BountyApiError } from "@bounty-ai/agent-sdk";

const client = new Bounty({
  apiKey: "agent_key_test",
  fetch: async () => new Response(),
});

void client.bounties.list;
void BountyApiError;
