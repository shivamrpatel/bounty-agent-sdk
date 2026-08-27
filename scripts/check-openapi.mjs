import { readFile } from "node:fs/promises";
import {
  checksumsURL,
  fetchOpenAPIContract,
  generatedURL,
  renderOpenAPITypes,
  serializeOpenAPIContract,
  sha256,
  snapshotURL,
} from "./openapi.mjs";

const [snapshotText, generatedText, checksumsText] = await Promise.all([
  readFile(snapshotURL, "utf8"),
  readFile(generatedURL, "utf8"),
  readFile(checksumsURL, "utf8"),
]);
const checksums = JSON.parse(checksumsText);
const snapshotHash = sha256(snapshotText);
const generatedTypesHash = sha256(generatedText);
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

const expectedGeneratedText = await renderOpenAPITypes(snapshotText);
if (generatedText !== expectedGeneratedText) {
  throw new Error(
    "The generated Agent declarations do not match the pinned OpenAPI snapshot. Run pnpm openapi:update and review the result.",
  );
}

const liveContract = await fetchOpenAPIContract();
if (serializeOpenAPIContract(liveContract) !== snapshotText) {
  throw new Error(
    "The live Agent OpenAPI contract differs from the pinned SDK snapshot. Run pnpm openapi:update and review the API change before publishing.",
  );
}

console.log(`Agent OpenAPI contract is current (${snapshotHash.slice(0, 12)}).`);
