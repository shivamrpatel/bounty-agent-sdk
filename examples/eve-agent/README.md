# Eve Agent example

A minimal Eve Agent mounting the official Bounty extension.

```sh
export BOUNTY_API_KEY=...
export BOUNTY_WEBHOOK_SECRET=...
pnpm exec eve dev
```

Register `https://<your-agent>/webhooks/bounty` as the webhook URL. The
extension supplies the channel, tools, and Bounty workflow skill; the example
only chooses its model and base instructions.
