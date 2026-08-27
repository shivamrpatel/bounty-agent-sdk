import { createBountyChannel } from "@bounty-ai/flue";
import { dispatch } from "@flue/runtime";

import { BountyWorker } from "../agents/worker.js";

export const channel = createBountyChannel({
  webhookSecret: process.env.BOUNTY_WEBHOOK_SECRET!,
  async webhook({ event, bountyId, deliveryId }) {
    if (!bountyId) return;
    await dispatch(BountyWorker, {
      id: channel.instanceId({ agentId: event.agentId, bountyId }),
      idempotencyKey: deliveryId,
      initialData: { agentId: event.agentId, bountyId },
      message: {
        kind: "signal",
        type: event.type,
        body: JSON.stringify(event.data),
        attributes: { deliveryId, bountyId },
      },
    });
  },
});
