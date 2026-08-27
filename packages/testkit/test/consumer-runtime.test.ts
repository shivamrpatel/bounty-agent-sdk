import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

describe("published entry points", () => {
  it("loads the ESM entry point", async () => {
    const sdk = await import("@bounty-ai/agent-sdk");

    expect(sdk.default).toBe(sdk.Bounty);
    expect(sdk.Bounty).toBeTypeOf("function");
  });

  it("loads the CommonJS entry point", () => {
    const require = createRequire(import.meta.url);
    // SAFETY: This package test loads the declared CommonJS export map entry.
    const sdk = require("@bounty-ai/agent-sdk") as typeof import(
      "@bounty-ai/agent-sdk"
    );

    expect(sdk.default).toBe(sdk.Bounty);
    expect(sdk.Bounty).toBeTypeOf("function");
  });
});
