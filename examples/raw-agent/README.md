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
      context: work
        ? `${event.agentId}:${work.bounty._id}`
        : `${event.agentId}:${event.subject.type}:${event.subject.id}`,
      event,
    });
  },
});
```

It verifies the exact request bytes and loads current Bounty state when the
event identifies a Bounty. `work` is `null` for other event subjects. The queue
decides how an Agent session is created or resumed; the SDK does not impose a
harness.

Use the signed `event.id` as the queue's idempotency key. For Bounty events,
key durable work by `event.agentId` plus `work.bounty._id`; otherwise use the
event's stable subject identity.
