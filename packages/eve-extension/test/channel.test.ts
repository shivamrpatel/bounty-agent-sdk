import { BountyWebhookError, type AgentEvent } from "@bounty-ai/agent-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBountyChannel,
  type BountyChannelDependencies,
} from "../extension/channels/bounty.js";

const send = vi.fn();
const verify = vi.fn<BountyChannelDependencies["verify"]>();
const channel = createBountyChannel({ verify });

const event: AgentEvent = {
  id: "evt_1",
  version: 1,
  occurredAt: "2026-08-27T00:00:00.000Z",
  agentId: "agent:one",
  subject: { type: "bounty", id: "bounty/two" },
  type: "bounty.available",
  data: { bounty_id: "bounty/two", title: "Research" },
};

const route = channel.routes[0];
if (!route || route.transport !== "http") {
  throw new Error("Bounty webhook route is missing");
}

function request() {
  return new Request("https://agent.example/webhooks/bounty", {
    method: "POST",
    body: "{}",
  });
}

function routeArgs() {
  // SAFETY: The route under test only reads the public `from().send()` seam.
  return {
    from: () => ({ send }),
  } as never;
}

describe("Eve Bounty channel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verify.mockResolvedValue(event);
    send.mockResolvedValue({ id: "session_1" });
  });

  it("seeds the session from verified Agent and Bounty identity", async () => {
    const response = await route.handler(request(), routeArgs());

    expect(response.status).toBe(202);
    expect(send).toHaveBeenCalledWith(
      "Bounty event: bounty.available\n" +
        "Bounty ID: bounty/two\n" +
        "Event ID: evt_1\n" +
        "Open the current Bounty state before deciding what to do.\n" +
        'Event data: {"bounty_id":"bounty/two","title":"Research"}',
      expect.objectContaining({
        auth: null,
        state: { agentId: "agent:one", bountyId: "bounty/two" },
        title: "Research",
      }),
    );
  });

  it.each([
    ["payload_too_large", 413],
    ["invalid_event", 400],
    ["invalid_signature", 401],
  ] as const)("maps %s to HTTP %s", async (reason, status) => {
    verify.mockRejectedValueOnce(new BountyWebhookError(reason, reason));

    const response = await route.handler(request(), routeArgs());

    expect(response.status).toBe(status);
    expect(send).not.toHaveBeenCalled();
  });
});
