import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workspaceRoot = new URL("..", import.meta.url).pathname;
const packageDirectories = [
  "packages/agent-sdk",
  "packages/eve-extension",
  "packages/flue",
].map((path) => join(workspaceRoot, path));
const temporaryDirectory = await mkdtemp(join(tmpdir(), "bounty-packages-"));
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

try {
  for (const packageDirectory of packageDirectories) {
    run(
      [
        "pack",
        "--config.ignore-scripts=true",
        "--pack-destination",
        temporaryDirectory,
      ],
      packageDirectory,
    );
  }
  const tarballs = (await readdir(temporaryDirectory))
    .filter((name) => name.endsWith(".tgz"))
    .map((name) => join(temporaryDirectory, name));
  if (tarballs.length !== packageDirectories.length) {
    throw new Error("Every package candidate must produce one tarball");
  }
  const sdkTarball = tarballs.find((path) => path.includes("agent-sdk"));
  const eveTarball = tarballs.find((path) => path.includes("eve-extension"));
  const flueTarball = tarballs.find((path) => path.includes("bounty-ai-flue"));
  if (!sdkTarball || !eveTarball || !flueTarball) {
    throw new Error("A package candidate tarball could not be identified");
  }

  await writeFile(
    join(temporaryDirectory, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        "@bounty-ai/agent-sdk": `file:${sdkTarball}`,
        "@bounty-ai/eve-extension": `file:${eveTarball}`,
        "@bounty-ai/flue": `file:${flueTarball}`,
        "@flue/runtime": "2.0.3",
        eve: "0.45.2",
      },
    }),
  );
  await writeFile(
    join(temporaryDirectory, "pnpm-workspace.yaml"),
    `overrides:\n  "@bounty-ai/agent-sdk": "file:${sdkTarball}"\n`,
  );
  run(["install", "--ignore-scripts"], temporaryDirectory);

  await writeFile(
    join(temporaryDirectory, "esm.mjs"),
    'import Bounty, { Bounty as NamedBounty } from "@bounty-ai/agent-sdk";\n' +
      'import bountyExtension from "@bounty-ai/eve-extension";\n' +
      'import { createBountyChannel } from "@bounty-ai/flue";\n' +
      'const client = new Bounty({ apiKey: "test", fetch: globalThis.fetch });\n' +
      'const channel = createBountyChannel({ webhookSecret: "test", webhook() {} });\n' +
      'if (Bounty !== NamedBounty || client.constructor !== Bounty) throw new Error("Invalid SDK ESM entry point");\n' +
      'if (typeof bountyExtension !== "function") throw new Error("Invalid Eve extension entry point");\n' +
      'if (typeof channel.route !== "function") throw new Error("Invalid Flue entry point");\n',
  );
  await writeFile(
    join(temporaryDirectory, "commonjs.cjs"),
    'const sdk = require("@bounty-ai/agent-sdk");\n' +
      'const client = new sdk.Bounty({ apiKey: "test", fetch: globalThis.fetch });\n' +
      'if (sdk.default !== sdk.Bounty || client.constructor !== sdk.Bounty) throw new Error("Invalid SDK CommonJS entry point");\n',
  );

  for (const file of ["esm.mjs", "commonjs.cjs"]) {
    const result = spawnSync(process.execPath, [file], {
      cwd: temporaryDirectory,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Packed ${file} check failed`);
  }

  console.log("Packed SDK, Eve candidate, and Flue entry points load successfully.");
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
