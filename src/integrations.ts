import type {
  AssignmentAction,
  EmailDeliveryAction,
  EmailDeliveryInput,
  EmailRecipient,
  IntegrationAction,
} from "./types";

export type CreateIntegrationActionInput = {
  actionKey?: string;
  type: string;
  operation: string;
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type CreateEmailDeliveryActionInput = {
  actionKey?: string;
  mode: "draft" | "send";
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  metadata?: Record<string, unknown>;
};

function normalizeRecipients(recipients: EmailRecipient[], label: string) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error(`${label} must include at least one recipient`);
  }
  return recipients.map((recipient, index) => {
    if (!recipient || typeof recipient.email !== "string" || recipient.email.trim().length === 0) {
      throw new Error(`${label}[${index}] is missing email`);
    }
    return {
      email: recipient.email.trim(),
      ...(typeof recipient.name === "string" && recipient.name.trim().length > 0
        ? { name: recipient.name.trim() }
        : {}),
    };
  });
}

export function createIntegrationAction(input: CreateIntegrationActionInput): IntegrationAction {
  if (typeof input.type !== "string" || input.type.trim().length === 0) {
    throw new Error("type is required");
  }
  if (typeof input.operation !== "string" || input.operation.trim().length === 0) {
    throw new Error("operation is required");
  }
  if (!input.input || typeof input.input !== "object" || Array.isArray(input.input)) {
    throw new Error("input must be an object");
  }

  return {
    type: input.type.trim(),
    ...(typeof input.actionKey === "string" && input.actionKey.trim().length > 0
      ? { actionKey: input.actionKey.trim() }
      : {}),
    operation: input.operation.trim(),
    input,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}

function createEmailDeliveryInput(input: CreateEmailDeliveryActionInput): EmailDeliveryInput {
  if (typeof input.subject !== "string" || input.subject.trim().length === 0) {
    throw new Error("Email subject is required");
  }
  if (typeof input.textBody !== "string" || input.textBody.trim().length === 0) {
    throw new Error("Email textBody is required");
  }

  return {
    to: normalizeRecipients(input.to, "to"),
    ...(input.cc && input.cc.length > 0 ? { cc: normalizeRecipients(input.cc, "cc") } : {}),
    ...(input.bcc && input.bcc.length > 0 ? { bcc: normalizeRecipients(input.bcc, "bcc") } : {}),
    subject: input.subject.trim(),
    textBody: input.textBody.trim(),
    ...(typeof input.htmlBody === "string" && input.htmlBody.trim().length > 0
      ? { htmlBody: input.htmlBody }
      : {}),
  };
}

export function createEmailDeliveryAction(
  input: CreateEmailDeliveryActionInput,
): EmailDeliveryAction {
  const emailInput = createEmailDeliveryInput(input);
  return {
    ...createIntegrationAction({
      ...(input.actionKey ? { actionKey: input.actionKey } : {}),
      type: "email",
      operation: input.mode,
      input: emailInput as unknown as Record<string, unknown>,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
    type: "email",
    operation: input.mode,
    input: emailInput,
  };
}

export function isIntegrationAction(action: AssignmentAction): action is IntegrationAction {
  return typeof action.type === "string" && typeof action.operation === "string";
}

export function isEmailDeliveryAction(action: AssignmentAction): action is EmailDeliveryAction {
  return action.type === "email" && (action.operation === "draft" || action.operation === "send");
}
