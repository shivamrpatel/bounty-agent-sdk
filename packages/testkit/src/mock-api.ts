export interface AgentApiMockCall {
  request: Request;
}

export type AgentApiMockHandler = (
  request: Request,
) => Response | Promise<Response>;

interface ExpectedRequest {
  method: string;
  pathname: string;
  handler: AgentApiMockHandler;
}

type MockResponseBody =
  | string
  | number
  | boolean
  | null
  | readonly MockResponseBody[]
  | { readonly [key: string]: MockResponseBody };

export class AgentApiMock {
  readonly calls: AgentApiMockCall[] = [];
  readonly #expected: ExpectedRequest[] = [];

  readonly fetch: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    this.calls.push({ request: request.clone() });
    const expected = this.#expected.shift();
    if (!expected) {
      throw new Error(
        `Unexpected request: ${request.method} ${new URL(request.url).pathname}`,
      );
    }
    const pathname = new URL(request.url).pathname;
    if (request.method !== expected.method || pathname !== expected.pathname) {
      throw new Error(
        `Expected ${expected.method} ${expected.pathname}, received ${request.method} ${pathname}`,
      );
    }
    return await expected.handler(request);
  };

  expect(
    method: string,
    pathname: string,
    response: Response | AgentApiMockHandler,
  ) {
    this.#expected.push({
      method: method.toUpperCase(),
      pathname,
      handler: response instanceof Response ? () => response.clone() : response,
    });
    return this;
  }

  assertComplete() {
    if (this.#expected.length > 0) {
      const remaining = this.#expected
        .map(({ method, pathname }) => `${method} ${pathname}`)
        .join(", ");
      throw new Error(`Expected requests were not made: ${remaining}`);
    }
  }
}

export function jsonResponse(
  body: MockResponseBody,
  status = 200,
  headers: HeadersInit = {},
) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json");
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}
