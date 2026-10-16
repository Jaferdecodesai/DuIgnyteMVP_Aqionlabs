import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stage = path.join(root, ".cloudflare-build");
await fs.rm(stage, { recursive: true, force: true });
await fs.mkdir(path.join(stage, "src/lib"), { recursive: true });
await fs.cp(path.join(root, "src/app"), path.join(stage, "src/app"), {
  recursive: true,
  filter: (source) => path.relative(path.join(root, "src/app"), source).split(path.sep)[0] !== "api",
});
await fs.cp(path.join(root, "src/components"), path.join(stage, "src/components"), { recursive: true });
await fs.copyFile(path.join(root, "src/lib/types.ts"), path.join(stage, "src/lib/types.ts"));
try { await fs.cp(path.join(root, "public"), path.join(stage, "public"), { recursive: true }); }
catch (error) { if (error.code !== "ENOENT") throw error; }
await fs.copyFile(path.join(root, "package.json"), path.join(stage, "package.json"));
await fs.symlink(path.join(root, "node_modules"), path.join(stage, "node_modules"), "dir");
await fs.writeFile(path.join(stage, "next.config.mjs"), `export default {
  output: "export", poweredByHeader: false, images: { unoptimized: true },
  distDir: ".next", trailingSlash: false, outputFileTracingRoot: process.cwd()
};\n`);
await fs.writeFile(path.join(stage, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2022", lib: ["dom", "dom.iterable", "esnext"], skipLibCheck: true,
    strict: true, noEmit: true, esModuleInterop: true, module: "esnext",
    moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true,
    jsx: "react-jsx", plugins: [{ name: "next" }], paths: { "@/*": ["./src/*"] },
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"],
}, null, 2));

// This is a genuine Next.js export. Only the Node-specific route adapter is
// omitted; its complete domain/API behavior is deployed in the native Worker.
const environment = { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
for (const key of Object.keys(environment)) {
  if (/^(MYSQL_|SESSION_SECRET$|DEMO_ACCESS_CODE$|CLOUDFLARE_API_TOKEN$)/.test(key)) delete environment[key];
}
const result = spawnSync(process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
  { cwd: stage, env: environment, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);
await fs.access(path.join(stage, "out/index.html"));
console.log("Cloudflare assets ready: .cloudflare-build/out (no environment files copied).");
