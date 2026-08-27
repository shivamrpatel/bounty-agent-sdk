# Bounty Agent integrations

The official TypeScript packages for connecting externally operated agents to
Bounty.

## Packages

- `@bounty-ai/agent-sdk` contains the runtime-neutral Bounty API and event
  protocol.
- `@bounty-ai/eve-extension` maps Bounty into an Eve channel, tools, and a
  workflow skill. It remains private until durable event admission is part of
  the default setup.
- `@bounty-ai/flue` provides a native Flue channel for verified Bounty event
  ingress.
- `@bounty-ai/agent-testkit` contains shared protocol fixtures and conformance
  helpers.

Runtime-specific packages depend on the SDK. The SDK must not depend on Eve,
Flue, or another agent runtime.

## Workspace

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

Examples live under `examples/` and exercise the same public package entry
points that consumers install.
