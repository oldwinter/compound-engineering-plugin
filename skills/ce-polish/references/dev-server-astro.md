# Astro dev-server recipe（dev-server 配方，auto-detect fallback）

当 `detect-project-type.sh` 返回 `astro`，且没有 `.claude/launch.json` 可查询时加载。

## Signature（识别特征）

- 存在 `astro.config.js`、`astro.config.mjs` 或 `astro.config.ts`
- `package.json` 包含 `astro` dependency

## Start command（启动命令）

Standard（标准）:

```bash
npm run dev
```

`package.json` 中的 `dev` script 通常包装 `astro dev`。也有效（读取 `package.json` scripts，确认项目使用哪一个）：

```bash
pnpm dev
yarn dev
bun run dev
```

优先使用 lockfile 指示的 package manager：
- `pnpm-lock.yaml` -> `pnpm dev`
- `yarn.lock` -> `yarn dev`
- `bun.lock` / `bun.lockb` -> `bun run dev`
- `package-lock.json` or none -> `npm run dev`

## Port（端口）

Default（默认）：`4321`。Astro respects `--port <port>` 和 `astro.config.*` 中的 `server.port` 字段。Overrides 遵循 `references/dev-server-detection.md` 中的 cascade。

## Stub generation（stub 生成）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Astro dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 4321
    }
  ]
}
```

替换为 resolved package manager（`npm` / `pnpm` / `yarn` / `bun`）和 port。

## Common gotchas（常见坑）

- **SSR vs SSG：** `astro dev` 对两种 output modes 的运行方式相同；差异只在 build time 重要。Polish 不需要区分它们。
- **Astro config 优先于 Vite config：** Astro 底层使用 Vite，但有自己的 config file。当 `astro.config.*` 和 `vite.config.*` 同时存在时，`astro` type 优先于 `vite`。这很少见；Astro projects 通常没有单独的 Vite config file。
- **Dev toolbar（Astro 4+）：** Astro 4+ 包含 dev toolbar，会在 browser 中添加 overlay UI。它不影响 port binding 或 URL routing；polish 可以忽略它。
