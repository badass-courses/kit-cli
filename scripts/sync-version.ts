import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");
const packageJsonPath = resolve(projectRoot, "package.json");
const indexPath = resolve(projectRoot, "src/index.ts");

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
  version?: string;
};

if (!packageJson.version) {
  throw new Error("package.json is missing version");
}

const source = await readFile(indexPath, "utf8");
const updated = source.replace(
  /const CLI_VERSION = "[^"]+";/,
  `const CLI_VERSION = ${JSON.stringify(packageJson.version)};`
);

if (updated === source) {
  throw new Error("Could not find CLI_VERSION in src/index.ts");
}

await writeFile(indexPath, updated);
console.log(`Synced CLI_VERSION to ${packageJson.version}`);
