import { defineConfig } from "tsup";

const isDev = process.env.npm_lifecycle_event === "dev";

export default defineConfig({
  clean: true,
  entry: ["src/cli.ts", "src/server.ts", "src/types.ts", "src/index.ts"],
  format: ["esm"],
  minify: !isDev,
  target: "esnext",
  outDir: "dist",
  dts: true, // 生成 .d.ts 类型文件
  splitting: false,
  sourcemap: true,
  onSuccess: isDev ? "node dist/cli.js" : undefined,
});