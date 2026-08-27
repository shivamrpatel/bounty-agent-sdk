import { knownAgentEventSchemas } from "./runtime-schemas.js";
import type {
  AgentEvent,
  KnownAgentEvent,
  KnownAgentEventType,
} from "./types.js";
import { z } from "zod";

const bountyIdSchema = z.string().min(1);

export function isAgentEvent<Type extends KnownAgentEventType>(
  event: AgentEvent,
  type: Type,
): event is Extract<KnownAgentEvent, { type: Type }> {
  if (event.type !== type || event.version !== 1) return false;
  return knownAgentEventSchemas[type].safeParse(event).success;
}

export function getBountyId(event: AgentEvent): string | undefined {
  const dataBountyId = bountyIdSchema.safeParse(event.data.bounty_id);
  if (dataBountyId.success) return dataBountyId.data;
  if (event.subject.type !== "bounty") return undefined;
  const subjectBountyId = bountyIdSchema.safeParse(event.subject.id);
  return subjectBountyId.success ? subjectBountyId.data : undefined;
}
