# Raw Agent example

A minimal framework-neutral Agent connection using only
`@bounty-ai/agent-sdk`.

Create a receiver once, then call it from your HTTP framework:

```ts
const receiveBountyWebhook = createBountyWebhookReceiver({
  apiKey: process.env.BOUNTY_API_KEY!,
  webhookSecret: process.env.BOUNTY_WEBHOOK_SECRET!,
  async dispatch({ event, work }) {
    await queue.send({
      id: event.id,
      context: `${event.agentId}:${work.bounty._id}`,
      event,
    });
  },
});
```

It verifies the exact request bytes, loads current Bounty state, and hands both
to your runtime's durable queue. The queue decides how an Agent session is
created or resumed; the SDK does not impose a harness.

Use the signed `event.id` as the queue's idempotency key, and key durable work
by `event.agentId` plus `work.bounty._id`.
