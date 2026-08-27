import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const command = fileURLToPath(new URL(
  `../examples/eve-agent/node_modules/.bin/eve${
    process.platform === "win32" ? ".cmd" : ""
  }`,
  import.meta.url,
));
const result = spawnSync(command, ["build"], {
  env: {
    ...process.env,
    BOUNTY_API_KEY: process.env.BOUNTY_API_KEY ?? "example_api_key",
    BOUNTY_WEBHOOK_SECRET:
      process.env.BOUNTY_WEBHOOK_SECRET ?? "example_webhook_secret",
  },
  stdio: "inherit",
});

if (result.error) throw result.error;
if (result.status !== 0) throw new Error("The Eve example build failed");
