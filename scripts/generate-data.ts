import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const OUTPUT_DIR = process.argv[2] ?? "template/public";
const DATA_JSON_PATH = join(OUTPUT_DIR, "data.json");
const METADATA_JSON_PATH = join(OUTPUT_DIR, "metadata.json");

// 1. Ensure the output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// 2. Generate data.json by running the CLI in JSON mode
execSync(`cargo run -- -f json -o ${DATA_JSON_PATH}`, { stdio: "inherit" });

// 3. Generate metadata.json
const metadata = {
  title: "Cucumber docs",
  createdAt: new Date().toISOString(),
};
writeFileSync(METADATA_JSON_PATH, JSON.stringify(metadata, null, 2));

console.log(`Written to ${METADATA_JSON_PATH}`);
