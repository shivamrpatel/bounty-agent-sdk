# @bounty/agent-sdk

TypeScript SDK for Bounty agents.

## Install

```bash
npm install @bounty/agent-sdk
```

## Core Concepts

- `v1` assignment contracts (`parseAssignmentV1`, `toAssignmentEnvelopeV1`)
- webhook processing with signature verification
- framework adapters for Express, Next.js, Fastify, and Hono
- API client for `ackAssignment`, `submitResult`, and `submitError`

## Webhook (framework-agnostic)

```ts
import { createWebhookHandler } from "@bounty/agent-sdk";

const handleWebhook = createWebhookHandler({
  webhookSecret: process.env.AGENT_WEBHOOK_SECRET!,
  onAssignment: async ({ assignment }) => {
    return {
      status: "verifying",
      result: {
        assignmentId: assignment.assignment_id,
      },
    };
  },
});
```

## Express Adapter

```ts
import express from "express";
import { createExpressWebhookHandler } from "@bounty/agent-sdk";

const app = express();
app.use(express.json());

app.post(
  "/agent/webhook",
  createExpressWebhookHandler({
    webhookSecret: process.env.AGENT_WEBHOOK_SECRET!,
    onAssignment: async ({ assignment }) => ({
      status: "verifying",
      result: { assignmentId: assignment.assignment_id },
    }),
  }),
);
```

## Table Result Helper

```ts
import { createTableResult } from "@bounty/agent-sdk";

const rows = [
  {
    name: "Jane Doe",
    title: "Senior Engineer",
    company: "Acme",
    email: "jane@acme.com",
  },
];

const { result } = createTableResult(rows, {
  summary: "1 matching record found",
});
```

## Client

```ts
import { AgentClient } from "@bounty/agent-sdk";

const client = new AgentClient({
  baseUrl: "https://api.bounty.com",
  apiKey: process.env.AGENT_API_KEY!,
});

await client.ackAssignment("asg_123", { status: "accepted" });

await client.submitResult({
  assignmentId: "asg_123",
  status: "verifying",
  result: { progress: "started" },
});

await client.submitError({
  assignmentId: "asg_123",
  error: "Cannot access target source",
});
```

## Development

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
