import assert from "node:assert/strict";
import Bounty from "../packages/agent-sdk/dist/index.js";

const apiKey = process.env.BOUNTY_AGENT_API_KEY;
const baseURL = process.env.BOUNTY_API_BASE_URL;
if (!apiKey || !baseURL) {
  throw new Error("BOUNTY_AGENT_API_KEY and BOUNTY_API_BASE_URL are required");
}

const bounty = new Bounty({ apiKey, baseURL });

async function drainEvents(cursor) {
  const events = [];
  let nextCursor = cursor;
  while (true) {
    const page = await bounty.events.poll({ cursor: nextCursor, limit: 100 });
    events.push(...page.events);
    nextCursor = page.next_cursor;
    if (!page.has_more) return { events, cursor: nextCursor };
  }
}

async function waitForEventTypes(cursor, requiredTypes) {
  const found = new Set();
  let nextCursor = cursor;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const page = await bounty.events.poll({ cursor: nextCursor, limit: 100 });
    nextCursor = page.next_cursor;
    for (const event of page.events) {
      if (requiredTypes.has(event.type)) found.add(event.type);
    }
    if ([...requiredTypes].every((type) => found.has(type))) return [...found];
  }
  return [...found];
}

const initial = await drainEvents(undefined);
const bounties = [];
for await (const item of bounty.bounties.iterate({ limit: 100 })) bounties.push(item);

const openSummary = bounties.find((item) => item.title === "Sales leader hiring signals");
const rejectionEvent = initial.events.find(
  (event) => event.type === "submission.verification_failed",
);
assert(openSummary, "A fresh workspace open Bounty was not visible to the Agent");
assert(rejectionEvent, "The seeded revision event was not recoverable from the event feed");
assert(rejectionEvent.data.bounty_id, "The revision event did not identify a Bounty");

const openWork = await bounty.bounties.open(openSummary._id);
assert.equal(openWork.bounty.status, "open", "Reset the workspace before running this check");
assert(openWork.comments.length >= 3, "Public discussion was unavailable before Claim");

const commentInput = {
  body: "Live SDK conformance: public discussion remains available before Claim.",
  idempotency_key: "workspace-live:open-comment:v1",
};
const comment = await openWork.comment(commentInput);
const commentReplay = await openWork.comment(commentInput);
assert.equal(commentReplay.comment_id, comment.comment_id);
assert.equal(commentReplay.replayed, true);

const claim = await openWork.claim();
assert.equal(claim.outcome, "claimed");
const claimReplay = await openWork.claim();
assert.equal(claimReplay.outcome, "claimed");
assert.equal(claimReplay.replayed, true);

const claimedWork = await openWork.refresh();
assert.equal(claimedWork.bounty.status, "claimed");
assert(claimedWork.currentClaim, "Claim was absent from refreshed work");

const messageInput = {
  text: "Live SDK conformance: the Agent can send a private progress update.",
  idempotency_key: "workspace-live:message:v1",
};
const message = await claimedWork.sendMessage(messageInput);
const messageReplay = await claimedWork.sendMessage(messageInput);
assert.equal(messageReplay.message._id, message.message._id);
assert.equal(messageReplay.replayed, true);

const messages = [];
for await (const item of claimedWork.messages({ limit: 100 })) messages.push(item);
assert(messages.some((item) => item._id === message.message._id));

const submissionInput = {
  deliverables: [
    {
      key: "result",
      type: "text",
      label: "Conformance result",
      data: { text: "The raw SDK completed the isolated workspace lifecycle." },
    },
  ],
  idempotency_key: "workspace-live:submission:v1",
};
const submission = await claimedWork.submit(submissionInput);
const submissionReplay = await claimedWork.submit(submissionInput);
assert.equal(submissionReplay.submission_id, submission.submission_id);
assert.equal(submissionReplay.replayed, true);

const rejectedWork = await bounty.bounties.open(rejectionEvent.data.bounty_id);
assert.equal(rejectedWork.bounty.title, "AI engineering podcast research");
assert.equal(rejectedWork.bounty.status, "claimed");
assert(rejectedWork.currentClaim, "Rejected Bounty did not preserve its active Claim");

const revisionInput = {
  deliverables: [
    {
      key: "results",
      type: "text",
      label: "Revised result",
      data: { text: "Every podcast entry now includes a recent episode URL." },
    },
  ],
  idempotency_key: "workspace-live:revision:v2",
};
const revision = await rejectedWork.submit(revisionInput);
const revisionReplay = await rejectedWork.submit(revisionInput);
assert.equal(revision.version, 2);
assert.equal(revisionReplay.submission_id, revision.submission_id);
assert.equal(revisionReplay.replayed, true);

const recoveredTypes = await waitForEventTypes(
  initial.cursor,
  new Set(["bounty.claimed"]),
);
assert(recoveredTypes.includes("bounty.claimed"), "Claim event was absent from recovery");

console.log(JSON.stringify({
  agentApi: "passed",
  bountiesVisible: bounties.length,
  publicCommentReplay: commentReplay.replayed,
  claimReplay: claimReplay.replayed,
  privateMessageReplay: messageReplay.replayed,
  submissionReplay: submissionReplay.replayed,
  revisionVersion: revision.version,
  revisionReplay: revisionReplay.replayed,
  recoveredEventTypes: recoveredTypes.sort(),
}, null, 2));
