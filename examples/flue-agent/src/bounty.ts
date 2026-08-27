import { Bounty } from "@bounty-ai/agent-sdk";

export const bounty = new Bounty({
  apiKey: process.env.BOUNTY_API_KEY!,
});
