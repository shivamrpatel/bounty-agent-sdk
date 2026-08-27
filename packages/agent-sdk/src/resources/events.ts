import { BountyConfigurationError } from "../errors.js";
import type { HttpClient } from "../http.js";
import { agentEventPageSchema } from "../runtime-schemas.js";
import type {
  AgentEventPage,
  EventFollowOptions,
  EventPollOptions,
} from "../types.js";

const defaultIdleDelayMs = 1_000;

export class EventsResource {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  poll(options: EventPollOptions = {}) {
    return this.#http.json<AgentEventPage>({
      method: "GET",
      path: "/v1/agent/events",
      query: { cursor: options.cursor, limit: options.limit },
      signal: options.signal,
      retryable: true,
      schema: agentEventPageSchema,
    });
  }

  async *follow(options: EventFollowOptions = {}) {
    const idleDelayMs = options.idleDelayMs ?? defaultIdleDelayMs;
    if (!Number.isFinite(idleDelayMs) || idleDelayMs < 0) {
      throw new BountyConfigurationError(
        "idleDelayMs must be zero or greater",
      );
    }
    let cursor = options.cursor;
    while (!options.signal?.aborted) {
      const page = await this.poll({
        cursor,
        limit: options.limit,
        signal: options.signal,
      });
      yield page;
      cursor = page.next_cursor;
      if (!page.has_more && !options.signal?.aborted) {
        await new Promise<void>((resolve) => {
          const finish = () => {
            globalThis.clearTimeout(timer);
            options.signal?.removeEventListener("abort", finish);
            resolve();
          };
          const timer = globalThis.setTimeout(finish, idleDelayMs);
          if (options.signal?.aborted) {
            finish();
          } else {
            options.signal?.addEventListener("abort", finish, { once: true });
          }
        });
      }
    }
  }
}
