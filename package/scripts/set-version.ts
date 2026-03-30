#!/usr/bin/env bun

/**
 * set-version.ts
 *
 * Usage: bun run package/scripts/set-version.ts <version>
 *
 * Sets the version field in package/package.json and all platform
 * package.json files under package/npm/, and updates the
 * optionalDependencies in the wrapper to match.
 *
 * The version argument may optionally include a leading "v"
 * (e.g. both "0.2.0" and "v0.2.0" are accepted).
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { globSync } from "fs";

const raw = process.argv[2];

if (!raw) {
	console.error("Usage: bun run set-version.ts <version>");
	process.exit(1);
}

const version = raw.startsWith("v") ? raw.slice(1) : raw;

if (!/^\d+\.\d+\.\d+/.test(version)) {
	console.error(`Invalid version format: "${raw}". Expected semver (e.g. 1.2.3 or v1.2.3).`);
	process.exit(1);
}

// Resolve paths relative to this script's location (package/scripts/)
const packageRoot = join(import.meta.dirname, "..");

function updatePackageJson(filePath: string, updater: (pkg: Record<string, unknown>) => void): void {
	const content = readFileSync(filePath, "utf8");
	const pkg = JSON.parse(content) as Record<string, unknown>;
	updater(pkg);
	writeFileSync(filePath, JSON.stringify(pkg, null, 2) + "\n");
	console.log(`Updated ${filePath}`);
}

// Update version in the wrapper and all platform packages
const packageJsonFiles = [
	join(packageRoot, "package.json"),
	...globSync("npm/*/package.json", { cwd: packageRoot }).map((f) => join(packageRoot, f)),
];

for (const file of packageJsonFiles) {
	updatePackageJson(file, (pkg) => {
		pkg.version = version;
	});
}

// Update optionalDependencies in the wrapper to match
updatePackageJson(join(packageRoot, "package.json"), (pkg) => {
	const optDeps = pkg.optionalDependencies as Record<string, string>;
	for (const key of Object.keys(optDeps)) {
		optDeps[key] = version;
	}
});

console.log(`\nAll packages set to version ${version}`);
