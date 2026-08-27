import {
  BountyWebhookError,
  getBountyId,
  type AgentEvent,
} from "@bounty-ai/agent-sdk";
import { defineChannel, POST } from "eve/channels";
import { z } from "zod";

import { bountyClient } from "../lib/bounty.js";

interface BountyChannelState {
  agentId: string;
  bountyId: string;
}

export type BountyChannelContext = Record<keyof BountyChannelState, string>;

const eventTitleSchema = z.string().min(1);

export interface BountyChannelDependencies {
  verify(request: Request): Promise<AgentEvent>;
}

const defaultDependencies: BountyChannelDependencies = {
  verify: (request) => bountyClient().webhooks.verify(request),
};

export function createBountyChannel(
  dependencies: BountyChannelDependencies = defaultDependencies,
) {
  return defineChannel<
    BountyChannelState,
    void,
    BountyChannelContext,
    BountyChannelContext
  >({
    state: {
      agentId: "",
      bountyId: "",
    },
    metadata: ({ agentId, bountyId }) => ({ agentId, bountyId }),
    routes: [
      POST("/webhooks/bounty", async (request, { from }) => {
        try {
          const event = await dependencies.verify(request);
          const bountyId = getBountyId(event);

          if (!bountyId) {
            return Response.json(
              { accepted: true, ignored: true },
              { status: 202 },
            );
          }

          const address = [
            "agent",
            encodeURIComponent(event.agentId),
            "bounty",
            encodeURIComponent(bountyId),
          ].join(":");
          const parsedTitle = eventTitleSchema.safeParse(event.data.title);
          const session = await from(address).send(
            [
              `Bounty event: ${event.type}`,
              `Bounty ID: ${bountyId}`,
              `Event ID: ${event.id}`,
              "Open the current Bounty state before deciding what to do.",
              `Event data: ${JSON.stringify(event.data)}`,
            ].join("\n"),
            {
              auth: null,
              state: { agentId: event.agentId, bountyId },
              title: parsedTitle.success
                ? parsedTitle.data
                : `Bounty ${bountyId}`,
            },
          );

          return Response.json({ accepted: true, sessionId: session.id }, {
            status: 202,
          });
        } catch (error) {
          if (error instanceof BountyWebhookError) {
            const status = error.reason === "payload_too_large"
              ? 413
              : error.reason === "invalid_signature" ||
                  error.reason === "invalid_signature_format" ||
                  error.reason === "timestamp_out_of_tolerance"
              ? 401
              : 400;
            return Response.json(
              { error: "invalid_bounty_webhook", reason: error.reason },
              { status },
            );
          }
          throw error;
        }
      }),
    ],
  });
}

export default createBountyChannel();
