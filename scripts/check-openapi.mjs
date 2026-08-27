import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const openapiURL = process.env.BOUNTY_OPENAPI_URL ??
  "https://api.trybounty.ai/openapi.json";
const snapshotURL = new URL(
  "../packages/agent-sdk/openapi/agent-v1.json",
  import.meta.url,
);
const generatedURL = new URL(
  "../packages/agent-sdk/src/internal/generated/agent-v1.ts",
  import.meta.url,
);
const checksumsURL = new URL("./openapi-checksums.json", import.meta.url);

const [snapshotText, generatedText, checksumsText] = await Promise.all([
  readFile(snapshotURL, "utf8"),
  readFile(generatedURL, "utf8"),
  readFile(checksumsURL, "utf8"),
]);
const checksums = JSON.parse(checksumsText);
const snapshotHash = createHash("sha256").update(snapshotText).digest("hex");
const generatedTypesHash = createHash("sha256")
  .update(generatedText)
  .digest("hex");
const generatedHash = generatedText.match(
  /OpenAPI snapshot SHA-256: ([a-f0-9]{64})/,
)?.[1];

if (
  snapshotHash !== checksums.snapshotSha256 ||
  generatedTypesHash !== checksums.generatedTypesSha256 ||
  generatedHash !== snapshotHash
) {
  throw new Error(
    "The pinned Agent OpenAPI snapshot or generated declarations changed without updating the independent checksums. Regenerate and review both files together.",
  );
}

const response = await fetch(openapiURL, {
  headers: { accept: "application/json" },
});
if (!response.ok) {
  throw new Error(
    `Could not fetch the live Agent OpenAPI contract (${response.status})`,
  );
}

const liveContract = await response.json();
const pinnedContract = JSON.parse(snapshotText);
if (JSON.stringify(liveContract) !== JSON.stringify(pinnedContract)) {
  throw new Error(
    "The live Agent OpenAPI contract differs from the pinned SDK snapshot. Review the API change before regenerating and publishing.",
  );
}

console.log(`Agent OpenAPI contract is current (${snapshotHash.slice(0, 12)}).`);
