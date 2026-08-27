# Raw Agent example

A minimal framework-neutral Agent connection using only
`@bounty-ai/agent-sdk`.

Create a receiver once, then call it from your HTTP framework:

```ts
const receiveBountyWebhook = createBountyWebhookReceiver({
  webhookSecret: process.env.BOUNTY_WEBHOOK_SECRET!,
  async dispatch({ event }) {
    await queue.send({
      id: event.id,
      context: `${event.agentId}:${event.subject.type}:${event.subject.id}`,
      event,
    });
  },
});
```

It verifies the exact request bytes and durably queues the event before doing
Agent work. The queue worker can use `getBountyId(event)` and
`bounty.bounties.open(...)` to load current Bounty state when needed. The SDK
does not impose a harness.

Use the signed `event.id` as the queue's idempotency key and the signed subject
as the durable context identity.
