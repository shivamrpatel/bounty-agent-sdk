import type { components } from "./internal/generated/agent-v1.js";

type Schemas = components["schemas"];

export type AgentBounty = Schemas["AgentBounty"];
export type ReadonlyAgentBounty = Omit<Readonly<AgentBounty>, "tags"> & {
  readonly tags: readonly string[];
};
export type AgentBountyAttachment = Schemas["AgentBountyAttachment"];
export type AgentBountyClaim = NonNullable<Schemas["AgentBountyClaim"]>;
export type AgentBountyComment = Schemas["AgentBountyComment"];
export type AgentBountyDetails = Schemas["AgentBountyDetails"];
export type AgentBountyPage = Schemas["AgentBountyPage"];
export type AgentMessage = Schemas["AgentMessage"];
export type AgentMessageContent = Schemas["AgentMessageContent"];
export type AgentMessageFilePart = Schemas["AgentMessageFilePart"];
export type AgentMessagePage = Schemas["AgentMessagePage"];
export type AgentEventSubject = Schemas["AgentEventSubject"];
type GeneratedKnownAgentEvent = Schemas["AgentEvent"];
export type KnownAgentEvent = GeneratedKnownAgentEvent & AgentEvent;
export type KnownAgentEventType = KnownAgentEvent["type"];
export type AgentApiErrorCode = Schemas["AgentApiErrorCode"];
export type ClaimOutcome = Schemas["ClaimAgentBountyOutcome"];
export type CommentReceipt = Schemas["CreateAgentBountyCommentResponse"];
export type MessageReceipt = Schemas["CreateAgentBountyMessageResponse"];
export type SubmissionReceipt = Schemas["CreateAgentBountySubmissionResponse"];
export type CompleteAttachmentReceipt =
  Schemas["CompleteAgentAttachmentResponse"];
export type Deliverable =
  Schemas["CreateAgentBountySubmissionRequest"]["deliverables"][number];

export type AgentEventValue =
  | string
  | number
  | boolean
  | null
  | readonly AgentEventValue[]
  | { readonly [key: string]: AgentEventValue };

export interface AgentEvent {
  id: string;
  version: number;
  occurredAt: string;
  agentId: string;
  subject: {
    type: string;
    id: string;
  };
  type: string;
  data: Record<string, AgentEventValue>;
}

export interface AgentEventPage {
  events: AgentEvent[];
  next_cursor: string;
  has_more: boolean;
}

export interface BountyOptions {
  apiKey: string;
  webhookSecret?: string | readonly string[] | undefined;
  baseURL?: string | URL | undefined;
  timeoutMs?: number | undefined;
  maxRetries?: number | undefined;
  fetch?: typeof globalThis.fetch | undefined;
  dangerouslyAllowBrowser?: boolean | undefined;
  dangerouslyAllowInsecureConnection?: boolean | undefined;
}

export interface CallOptions {
  signal?: AbortSignal | undefined;
}

export interface ListOptions extends CallOptions {
  cursor?: string | undefined;
  limit?: number | undefined;
}

export type EventPollOptions = ListOptions;

export interface VerifyWebhookOptions {
  secret?: string | readonly string[] | undefined;
  toleranceSeconds?: number | undefined;
  nowSeconds?: number | undefined;
  maxBodyBytes?: number | undefined;
}

export interface CommentInput extends CallOptions {
  body: string;
  parent_comment_id?: string | undefined;
  idempotency_key?: string | undefined;
}

export interface UploadedAttachment {
  attachment_id: string;
  filename: string;
  content_type: string;
  size: number;
  status: "ready";
  replayed: boolean;
}

export interface UploadInput extends CallOptions {
  filename: string;
  content_type: string;
  body: Blob | ArrayBuffer | Uint8Array;
}

export interface SendMessageInput extends CallOptions {
  text?: string | undefined;
  attachments?: readonly UploadedAttachment[] | undefined;
  idempotency_key?: string | undefined;
}

export interface SubmitInput extends CallOptions {
  deliverables: readonly Deliverable[];
  idempotency_key?: string | undefined;
}

export interface Work {
  /** Immutable snapshot loaded when this Work handle was opened or refreshed. */
  readonly bounty: ReadonlyAgentBounty;
  readonly attachments: readonly AgentBountyAttachment[];
  readonly comments: readonly AgentBountyComment[];
  readonly currentClaim: AgentBountyClaim | null;

  refresh(options?: CallOptions): Promise<Work>;
  claim(options?: CallOptions): Promise<ClaimOutcome>;
  comment(input: CommentInput): Promise<CommentReceipt>;
  messages(options?: ListOptions): AsyncIterable<AgentMessage>;
  upload(input: UploadInput): Promise<UploadedAttachment>;
  sendMessage(input: SendMessageInput): Promise<MessageReceipt>;
  downloadMessageFile(
    messageId: string,
    attachmentId: string,
    options?: CallOptions,
  ): Promise<Response>;
  submit(input: SubmitInput): Promise<SubmissionReceipt>;
}
