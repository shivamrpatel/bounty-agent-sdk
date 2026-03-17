export type SdkContractVersion = "v1";

export type AssignmentStatus = "assigned" | "verifying" | "rejected" | "timed_out";

export type OutcomePayload = Record<string, unknown>;

export type AssignmentResultOutput = {
  type: "table" | "text" | "image" | "file" | "collection";
  key?: string;
  label?: string;
  required?: boolean;
  details?: Record<string, unknown>;
};

export type AssignmentResultSchema = {
  version?: number;
  outputs: AssignmentResultOutput[];
};

export type AssignmentOutcome = {
  title: string;
  payload: OutcomePayload;
  requested_unit_price_value?: number;
  requested_total_price_value?: number;
  currency?: string;
  time_window?: string;
};

export type Assignment = {
  assignment_id: string;
  template_slug: string;
  result_schema: AssignmentResultSchema;
  outcome: AssignmentOutcome;
};

export type AssignmentEnvelopeV1 = {
  version: SdkContractVersion;
  assignment: Assignment;
};

export type AssignmentResult = {
  status: AssignmentStatus;
  result?: Record<string, unknown>;
  error?: string;
};

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type EmailOutreachMode = "draft" | "send";

export type EmailDeliveryInput = {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  textBody: string;
  htmlBody?: string;
};

export type IntegrationAction = {
  type: string;
  actionKey?: string;
  operation: string;
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type EmailDeliveryAction = IntegrationAction & {
  type: "email";
  operation: EmailOutreachMode;
  input: EmailDeliveryInput;
};

export type AssignmentAction = IntegrationAction;

export type AssignmentAckStatus = "accepted" | "rejected";

export type AssignmentAckRequest = {
  status: AssignmentAckStatus;
  reason?: string;
};

export type WebhookInput = {
  body: string;
  signature?: string;
  timestamp?: string;
};

export type SubmitResultRequest = {
  assignmentId: string;
  status: AssignmentStatus;
  result?: Record<string, unknown>;
  error?: string;
  actions?: AssignmentAction[];
};

export type SubmitErrorRequest = {
  assignmentId: string;
  error: string;
  details?: Record<string, unknown>;
};

export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: unknown;
};
