// Packs the library, installs the tarball in an empty project and uses it from there,
// so what is tested is exactly what gets published.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
// npm_execpath also works on Windows without invoking a .cmd through a shell.
const npm = (args, cwd = process.cwd()) =>
  execFileSync(process.execPath, ["--", process.env.npm_execpath, ...args], {
    cwd,
    encoding: "utf8",
  });
mkdirSync("artifacts", { recursive: true });
const [pack] = JSON.parse(
  npm([
    "pack",
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    "artifacts",
  ]),
);
for (const file of pack.files)
  assert.match(
    file.path,
    /^(dist\/[\w.-]+\.(js|d\.ts)|README\.md|LICENSE|package\.json)$/,
  );
assert.ok(pack.files.some((f) => f.path === "dist/index.js"));
assert.ok(pack.files.some((f) => f.path === "dist/index.d.ts"));
const temporary = mkdtempSync(join(tmpdir(), "mind-elixir-export-mermaid-"));
try {
  npm(["init", "-y"], temporary);
  npm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      resolve("artifacts", pack.filename),
    ],
    temporary,
  );
  const installedLock = JSON.parse(
    readFileSync(join(temporary, "package-lock.json")),
  );
  const installed = Object.keys(installedLock.packages).filter(Boolean);
  assert.deepEqual(
    installed,
    ["node_modules/@erseco/mind-elixir-export-mermaid"],
    "The package must have no runtime dependencies",
  );
  const check = `
    import convert, { mindElixirToMermaid } from "@erseco/mind-elixir-export-mermaid";
    const source = mindElixirToMermaid({ nodeData: { topic: "Root", children: [{ topic: "A & <b>" }] } });
    if (convert !== mindElixirToMermaid) process.exit(1);
    if (source !== 'mindmap\\n  n0(("Root"))\\n    n1("A & #lt;b#gt;")') process.exit(2);
  `;
  execFileSync(process.execPath, ["--input-type=module", "-e", check], {
    cwd: temporary,
  });
  assert.equal(
    JSON.parse(
      readFileSync(
        join(
          temporary,
          "node_modules",
          "@erseco",
          "mind-elixir-export-mermaid",
          "package.json",
        ),
      ),
    ).version,
    pack.version,
  );
  console.log(
    `PASS: ${pack.filename}, ${pack.files.length} allowed files, imported from the installed package`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
