#!/usr/bin/env node
/**
 * SonarQube at repo root expects SF: paths under sonar.sources (apps/web/src/...).
 * Vitest LCOV uses SF:src/... — rewrite after coverage run.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lcovPath = join(root, "coverage", "lcov.info");

if (!existsSync(lcovPath)) {
  console.error("prefix-lcov-sonar: coverage/lcov.info not found. Run vitest with --coverage first.");
  process.exit(1);
}

const text = readFileSync(lcovPath, "utf8");
const next = text.replace(/^SF:src\//gm, "SF:apps/web/src/");
writeFileSync(lcovPath, next, "utf8");
console.log("prefix-lcov-sonar: updated SF: paths in coverage/lcov.info for Sonar (repo root).");
