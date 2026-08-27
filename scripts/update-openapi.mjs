import { writeFile } from "node:fs/promises";
import {
  checksumsURL,
  fetchOpenAPIContract,
  generatedURL,
  openapiURL,
  renderOpenAPIChecksums,
  renderOpenAPITypes,
  serializeOpenAPIContract,
  sha256,
  snapshotURL,
} from "./openapi.mjs";

const contract = await fetchOpenAPIContract();
const snapshotText = serializeOpenAPIContract(contract);
const generatedText = await renderOpenAPITypes(snapshotText);
const checksumsText = renderOpenAPIChecksums(snapshotText, generatedText);

await Promise.all([
  writeFile(snapshotURL, snapshotText),
  writeFile(generatedURL, generatedText),
  writeFile(checksumsURL, checksumsText),
]);

console.log(
  `Updated Agent OpenAPI from ${openapiURL} (${sha256(snapshotText).slice(0, 12)}).`,
);
