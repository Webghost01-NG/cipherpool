import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.join(process.cwd(), "dist-frontend");
const assetsDirectory = path.join(outputDirectory, "assets");
const maximumJavaScriptChunkBytes = 500_000;

const html = await readFile(path.join(outputDirectory, "index.html"), "utf8");
const assetNames = await readdir(assetsDirectory);
const javaScriptChunks = assetNames.filter((name) => name.endsWith(".js")).sort();
const fheChunks = javaScriptChunks.filter((name) => name.startsWith("fhe-"));
const web3Chunks = javaScriptChunks.filter((name) => name.startsWith("web3-"));
const entryMatch = html.match(/src="\/assets\/(index-[^"]+\.js)"/);

assert.equal(fheChunks.length, 1, "The build must emit one isolated FHE JavaScript chunk.");
assert.equal(web3Chunks.length, 1, "The build must emit one isolated web3 JavaScript chunk.");
assert.ok(entryMatch, "The frontend entry chunk was not found in index.html.");
assert.doesNotMatch(html, /fhe-|web3-|\.wasm|workerHelpers/, "Web3 and FHE assets must not be loaded by the initial HTML.");

const entryCode = await readFile(path.join(assetsDirectory, entryMatch[1]), "utf8");
assert.match(entryCode, /import\([^)]*walletRuntime-[^)]*\.js[^)]*\)/, "The application must retain a dynamic web3 import boundary.");

const nonFheCode = (await Promise.all(
  javaScriptChunks
    .filter((name) => !name.startsWith("fhe-"))
    .map((name) => readFile(path.join(assetsDirectory, name), "utf8"))
)).join("\n");
assert.match(nonFheCode, /import\([^)]*fhe-[^)]*\.js[^)]*\)/, "The application must retain a dynamic FHE import boundary.");

const sizes = await Promise.all(javaScriptChunks.map(async (name) => ({
  chunk: name.replace(/-[A-Za-z0-9_-]+\.js$/, ".js"),
  bytes: (await stat(path.join(assetsDirectory, name))).size,
})));

for (const { chunk, bytes } of sizes) {
  assert.ok(
    bytes <= maximumJavaScriptChunkBytes,
    `${chunk} is ${bytes} bytes; JavaScript chunks must remain at or below ${maximumJavaScriptChunkBytes} bytes.`,
  );
}

console.table(sizes.map(({ chunk, bytes }) => ({
  chunk,
  kilobytes: (bytes / 1000).toFixed(2),
})));
