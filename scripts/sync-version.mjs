#!/usr/bin/env node
/**
 * Single source of truth: repo-root VERSION
 * Syncs to frontend/package.json and backend/VERSION.
 *
 * Usage:
 *   node scripts/sync-version.mjs          # sync only
 *   node scripts/sync-version.mjs patch    # bump patch then sync
 *   node scripts/sync-version.mjs minor
 *   node scripts/sync-version.mjs major
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const versionFile = path.join(root, "VERSION");
const frontendPkg = path.join(root, "frontend", "package.json");
const backendVersion = path.join(root, "backend", "VERSION");

function readVersion() {
  return fs.readFileSync(versionFile, "utf8").trim();
}

function writeVersion(v) {
  const line = `${v}\n`;
  fs.writeFileSync(versionFile, line);
  fs.writeFileSync(backendVersion, line);
}

function bump(part) {
  const [maj, min, pat] = readVersion().split(".").map(Number);
  if (part === "major") writeVersion(`${maj + 1}.0.0`);
  else if (part === "minor") writeVersion(`${maj}.${min + 1}.0`);
  else if (part === "patch") writeVersion(`${maj}.${min}.${pat + 1}`);
  else throw new Error(`Unknown bump: ${part}`);
}

function syncPackageJson(v) {
  const pkg = JSON.parse(fs.readFileSync(frontendPkg, "utf8"));
  pkg.version = v;
  fs.writeFileSync(frontendPkg, `${JSON.stringify(pkg, null, 2)}\n`);
}

const arg = process.argv[2];
if (arg === "patch" || arg === "minor" || arg === "major") bump(arg);
else if (arg && arg !== "sync") {
  console.error("Usage: sync-version.mjs [patch|minor|major|sync]");
  process.exit(1);
}

const v = readVersion();
syncPackageJson(v);
console.log(`Quaywatch version: ${v}`);
