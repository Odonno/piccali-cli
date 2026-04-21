import { execSync } from "child_process";
import { join } from "path";

const REPO_ROOT = join(import.meta.dirname, "..");
const OUTPUT_DIR = join(REPO_ROOT, "dist");

execSync(`cargo run -- -f html --assets "docs/**/*.png" -o ${OUTPUT_DIR}`, {
  stdio: "inherit",
});
