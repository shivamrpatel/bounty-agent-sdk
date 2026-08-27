import SDK = require("@bounty-ai/agent-sdk");

const { Bounty, BountyApiError } = SDK;

const client = new Bounty({
  apiKey: "agent_key_test",
  fetch: async () => new Response(),
});

void client.bounties.list;
void BountyApiError;
