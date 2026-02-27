import {
  DEFAULT_SIGNATURE_HEADER,
  DEFAULT_TIMESTAMP_HEADER,
  createWebhookHandler,
  executeWebhook,
  type WebhookHttpResponse,
  type WebhookHandlerOptions,
} from "./webhook";
import { SdkError } from "./errors";

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
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }
  if (body === undefined || body === null) {
    return "";
  }
  return JSON.stringify(body);
}

async function readExpressBody(req: {
  body?: unknown;
  rawBody?: string | Buffer;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
}) {
  if (typeof req.rawBody === "string" || Buffer.isBuffer(req.rawBody)) {
    return normalizeBody(req.rawBody);
  }

  if (req.body !== undefined) {
    if (typeof req.body === "object" && req.body !== null && !Buffer.isBuffer(req.body)) {
      throw new SdkError(
        "Express webhook route must receive raw bytes. Mount webhook routes before express.json() or exclude them from JSON parsing.",
      );
    }
    return normalizeBody(req.body);
  }

  if (!req.on) {
    return "";
  }

  return await new Promise<string>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on?.("data", (chunk: unknown) => {
      if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk, "utf8"));
      } else if (chunk instanceof Uint8Array) {
        chunks.push(chunk);
      }
    });
    req.on?.("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on?.("error", (error: unknown) => {
      reject(error);
    });
  });
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

function toBadRequest(error: unknown): WebhookHttpResponse {
  const message = error instanceof Error ? error.message : "Unexpected webhook error";
  return {
    status: 400,
    body: {
      status: "rejected",
      error: message,
    },
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
    let result: WebhookHttpResponse;
    try {
      const body = await readExpressBody(req);
      result = await executeWebhook(
        handler,
        toWebhookInput({
          body,
          signature: headerValue(req.headers, DEFAULT_SIGNATURE_HEADER),
          timestamp: headerValue(req.headers, DEFAULT_TIMESTAMP_HEADER),
        }),
      );
    } catch (error) {
      result = toBadRequest(error);
    }

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
