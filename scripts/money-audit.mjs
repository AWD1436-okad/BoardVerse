import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignored = new Set([".git", ".next", "node_modules"]);
const checkedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const warnings = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignored.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(root, fullPath);

    if (relative === path.join("scripts", "money-audit.mjs")) {
      continue;
    }

    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (!checkedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const text = await readFile(fullPath, "utf8");
    const lower = text.toLowerCase();

    for (const phrase of ["deposit", "withdrawal", "gambling", "betting"]) {
      if (lower.includes(phrase)) {
        warnings.push(`${relative}: contains "${phrase}"`);
      }
    }
  }
}

await walk(root);

if (warnings.length > 0) {
  console.error("Money safety audit found public-risk terms:");
  for (const warning of warnings) {
    console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Money safety audit passed: no real-money risk terms found.");
