import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageDirectories = ["packages/agent-sdk", "packages/flue"];
const args = process.argv.slice(2);
const tagIndex = args.indexOf("--tag");
const tag = tagIndex === -1 ? undefined : args.at(tagIndex + 1);
const dryRun = args.includes("--dry-run");

if (tag !== "beta" && tag !== "latest") {
  throw new Error("Pass --tag beta or --tag latest.");
}

const run = (command, commandArgs, options = {}) =>
  spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });

const runOrThrow = (command, commandArgs, options) => {
  const result = run(command, commandArgs, options);
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed.`);
  }
  return result;
};

const stagingDirectory = await mkdtemp(join(tmpdir(), "bounty-release-"));
const releases = [];

try {
  for (const packageDirectory of packageDirectories) {
    const manifest = JSON.parse(
      await readFile(join(root, packageDirectory, "package.json"), "utf8"),
    );
    const packageVersion = `${manifest.name}@${manifest.version}`;
    const lookup = run("npm", ["view", packageVersion, "version", "--json"], {
      stdio: "pipe",
    });

    if (lookup.status === 0) {
      console.log(`Skipping ${packageVersion}; it is already published.`);
      releases.push(packageVersion);
      continue;
    }

    const lookupOutput = `${lookup.stdout ?? ""}\n${lookup.stderr ?? ""}`;
    if (!lookupOutput.includes("E404")) {
      process.stderr.write(lookupOutput);
      throw new Error(`Could not check ${packageVersion} on npm.`);
    }

    const tarballName = `${manifest.name
      .replace(/^@/, "")
      .replaceAll("/", "-")}-${manifest.version}.tgz`;
    const tarball = join(stagingDirectory, tarballName);

    runOrThrow("pnpm", ["--filter", manifest.name, "pack", "--out", tarball]);

    const publishArgs = ["publish", tarball, "--access", "public", "--tag", tag];
    if (dryRun) publishArgs.push("--dry-run");
    runOrThrow("npm", publishArgs);
    releases.push(packageVersion);
  }

  if (!dryRun) {
    for (const packageVersion of releases) {
      const existingTag = run(
        "git",
        ["rev-parse", "--quiet", "--verify", `refs/tags/${packageVersion}`],
        { stdio: "ignore" },
      );
      if (existingTag.status !== 0) {
        runOrThrow("git", [
          "tag",
          "--annotate",
          packageVersion,
          "--message",
          packageVersion,
        ]);
      }
    }
  }
} finally {
  await rm(stagingDirectory, { force: true, recursive: true });
}
