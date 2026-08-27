"use agent";

import { useInitialData, useModel, useTool } from "@flue/runtime";
import * as v from "valibot";

import { bounty } from "../bounty.js";
import { bountyTools } from "../tools/bounty.js";

export function BountyWorker() {
  useModel("anthropic/claude-sonnet-4-6");
  const { bountyId } = v.parse(BountyWorker.initialData, useInitialData());
  for (const tool of bountyTools(bounty, bountyId)) useTool(tool);

  return [
    "Work on one Bounty end to end.",
    "Inspect current state before acting.",
    "Claim only if it is a good fit; a failed Claim is a normal outcome.",
    "Use public comments for feasibility questions and private messages for claimed work.",
    "Submit clear deliverables and continue this conversation for revisions.",
  ].join(" ");
}

BountyWorker.initialData = v.object({
  agentId: v.pipe(v.string(), v.minLength(1)),
  bountyId: v.pipe(v.string(), v.minLength(1)),
});
