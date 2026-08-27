import { defineTool } from "eve/tools";
import { z } from "zod";

import { bountyClient } from "../lib/bounty.js";

export default defineTool({
  description: "List Bounties currently visible to this Agent.",
  inputSchema: z.object({
    cursor: z.string().optional(),
    limit: z.number().int().positive().max(100).optional(),
  }),
  async execute(input, ctx) {
    return bountyClient().bounties.list({ ...input, signal: ctx.abortSignal });
  },
});
