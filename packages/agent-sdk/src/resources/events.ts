import type { HttpClient } from "../http.js";
import { agentEventPageSchema } from "../runtime-schemas.js";
import type {
  AgentEventPage,
  EventPollOptions,
} from "../types.js";

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

  async *follow(options: EventPollOptions = {}) {
    let cursor = options.cursor;
    while (!options.signal?.aborted) {
      const page = await this.poll({
        cursor,
        limit: options.limit,
        signal: options.signal,
      });
      yield page;
      cursor = page.next_cursor;
    }
  }
}
