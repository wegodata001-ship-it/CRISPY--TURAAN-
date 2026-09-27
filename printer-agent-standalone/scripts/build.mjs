import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(resolve(root, "dist"), { recursive: true });
mkdirSync(resolve(root, "logs"), { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: [resolve(root, "src/index.ts")],
  outfile: resolve(root, "dist/agent.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: false,
  minify: false,
  legalComments: "none",
  external: ["@napi-rs/canvas"],
});

console.log("Built dist/agent.cjs");
