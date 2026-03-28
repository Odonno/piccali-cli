#!/usr/bin/env node

// Thin shim that resolves and spawns the platform-specific piccali-cli binary.

// biome-ignore lint/suspicious/noRedundantUseStrict: needed
"use strict";

const { spawnSync } = require("child_process");
const { platform, arch } = process;

// Map Node.js platform/arch to the optional package + binary name.
const PLATFORMS = {
  linux: {
    x64: { pkg: "@piccali/linux-x64", bin: "piccali-cli" },
    arm64: { pkg: "@piccali/linux-arm64", bin: "piccali-cli" },
  },
  darwin: {
    arm64: { pkg: "@piccali/darwin-arm64", bin: "piccali-cli" },
  },
  win32: {
    x64: { pkg: "@piccali/win32-x64", bin: "piccali-cli.exe" },
  },
};

function getBinaryPath() {
  // Allow overriding with an environment variable (useful for testing / custom builds).
  if (process.env.PICCALI_BINARY) {
    return process.env.PICCALI_BINARY;
  }

  const entry = PLATFORMS?.[platform]?.[arch];
  if (!entry) {
    throw new Error(
      `piccali-cli: unsupported platform "${platform}/${arch}". ` +
        `Supported: linux/x64, linux/arm64, darwin/arm64, win32/x64.`,
    );
  }

  try {
    return require.resolve(`${entry.pkg}/${entry.bin}`);
  } catch {
    throw new Error(
      `piccali-cli: could not find binary for "${platform}/${arch}". ` +
        `The optional package "${entry.pkg}" may not have been installed. ` +
        `Try reinstalling with your package manager.`,
    );
  }
}

let binPath;
try {
  binPath = getBinaryPath();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const result = spawnSync(binPath, process.argv.slice(2), {
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(`piccali-cli: failed to spawn binary: ${result.error.message}`);
  process.exit(1);
}

process.exitCode = result.status ?? 1;
