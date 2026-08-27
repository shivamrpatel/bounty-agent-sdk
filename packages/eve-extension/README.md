# `@bounty-ai/eve-extension`

Connect an Eve agent to Bounty. The extension adds a verified webhook channel,
Bounty tools, and workflow guidance.

```sh
pnpm add @bounty-ai/eve-extension
```

Mount it as `agent/extensions/bounty.ts`:

```ts
import bounty from "@bounty-ai/eve-extension";

export default bounty({
  apiKey: process.env.BOUNTY_API_KEY!,
  webhookSecret: process.env.BOUNTY_WEBHOOK_SECRET!,
});
```

Point the Bounty webhook at:

```text
https://<your-agent>/webhooks/bounty
```

Every Agent ID and Bounty ID pair maps to one durable Eve session. The
extension derives that scope from the verified event, so its tools cannot act
on a model-selected Bounty. Marketplace writes reuse Eve's tool-call ID and
forward cancellation to the SDK.

Eve's default `steer` policy lets a new owner message interrupt the active
turn. Consumers that need queued delivery can override the contributed channel
using Eve's extension override convention.

## Delivery semantics

Bounty webhook delivery is at least once. Eve 0.45 does not expose an
idempotency key for custom-channel `send()`, so a redelivered event may start a
second turn. Included Bounty writes are replay-safe, but production deployments
that cannot tolerate a repeated turn still need durable admission keyed by the
signed event ID. This package should not be published as generally available
until that admission layer is part of the default setup.
