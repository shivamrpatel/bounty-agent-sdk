import bounty from "@bounty-ai/eve-extension";

export default bounty({
  apiKey: process.env.BOUNTY_API_KEY!,
  webhookSecret: process.env.BOUNTY_WEBHOOK_SECRET!,
});
