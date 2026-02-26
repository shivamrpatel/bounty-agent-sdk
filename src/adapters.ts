import {
  DEFAULT_SIGNATURE_HEADER,
  DEFAULT_TIMESTAMP_HEADER,
  createWebhookHandler,
  executeWebhook,
  type WebhookHandlerOptions,
} from "./webhook";

function headerValue(headers: Record<string, string | string[] | undefined>, key: string) {
  const value = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function normalizeBody(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }
  if (body === undefined || body === null) {
    return "";
  }
  return JSON.stringify(body);
}

function toWebhookInput(params: {
  body: string;
  signature: string | undefined;
  timestamp: string | undefined;
}) {
  return {
    body: params.body,
    ...(params.signature ? { signature: params.signature } : {}),
    ...(params.timestamp ? { timestamp: params.timestamp } : {}),
  };
}

export function createExpressWebhookHandler(options: WebhookHandlerOptions) {
  const handler = createWebhookHandler(options);

  return async function expressWebhook(
    req: {
      headers: Record<string, string | string[] | undefined>;
      body?: unknown;
      rawBody?: string;
    },
    res: {
      status: (code: number) => { json: (payload: unknown) => void };
    },
  ) {
    const body = req.rawBody ?? normalizeBody(req.body);
    const result = await executeWebhook(
      handler,
      toWebhookInput({
        body,
        signature: headerValue(req.headers, DEFAULT_SIGNATURE_HEADER),
        timestamp: headerValue(req.headers, DEFAULT_TIMESTAMP_HEADER),
      }),
    );

    res.status(result.status).json(result.body);
  };
}

export function createFastifyWebhookHandler(options: WebhookHandlerOptions) {
  const handler = createWebhookHandler(options);

  return async function fastifyWebhook(
    request: {
      headers: Record<string, string | string[] | undefined>;
      body?: unknown;
      rawBody?: string;
    },
    reply: {
      code: (statusCode: number) => { send: (payload: unknown) => void };
    },
  ) {
    const body = request.rawBody ?? normalizeBody(request.body);
    const result = await executeWebhook(
      handler,
      toWebhookInput({
        body,
        signature: headerValue(request.headers, DEFAULT_SIGNATURE_HEADER),
        timestamp: headerValue(request.headers, DEFAULT_TIMESTAMP_HEADER),
      }),
    );

    reply.code(result.status).send(result.body);
  };
}

export function createNextWebhookHandler(options: WebhookHandlerOptions) {
  const handler = createWebhookHandler(options);

  return async function nextWebhook(request: Request): Promise<Response> {
    const body = await request.text();
    const result = await executeWebhook(
      handler,
      toWebhookInput({
        body,
        signature: request.headers.get(DEFAULT_SIGNATURE_HEADER) ?? undefined,
        timestamp: request.headers.get(DEFAULT_TIMESTAMP_HEADER) ?? undefined,
      }),
    );

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "content-type": "application/json" },
    });
  };
}

export function createHonoWebhookHandler(options: WebhookHandlerOptions) {
  const handler = createWebhookHandler(options);

  return async function honoWebhook(c: {
    req: {
      text: () => Promise<string>;
      header: (name: string) => string | undefined;
    };
    json: (payload: unknown, status?: number) => Response;
  }) {
    const body = await c.req.text();
    const result = await executeWebhook(
      handler,
      toWebhookInput({
        body,
        signature: c.req.header(DEFAULT_SIGNATURE_HEADER),
        timestamp: c.req.header(DEFAULT_TIMESTAMP_HEADER),
      }),
    );

    return c.json(result.body, result.status);
  };
}
