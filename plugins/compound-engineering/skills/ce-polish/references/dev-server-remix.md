# Remix dev-server recipe（dev-server 配方，auto-detect fallback）

当 `detect-project-type.sh` 返回 `remix`，且没有 `.claude/launch.json` 可查询时加载。

## Signature（识别特征）

- 存在 `remix.config.js` 或 `remix.config.ts`（classic Remix）
- Vite 上的 Remix 2.x+ 没有 `remix.config.*`；它使用带 Remix plugin 的 `vite.config.ts`，因此解析为 `vite` type，而不是 `remix`

## Start command（启动命令）

Standard（标准）:

```bash
npm run dev
```

`package.json` 中的 `dev` script 通常包装 `remix dev`。也有效（读取 `package.json` scripts，确认项目使用哪一个）：

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

Default（默认）：`3000`。Remix respects `--port <port>` flag。Classic Remix dev server 也读取 `PORT` env var。Overrides 遵循 `references/dev-server-detection.md` 中的 cascade。

## Stub generation（stub 生成）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Remix dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

替换为 resolved package manager（`npm` / `pnpm` / `yarn` / `bun`）和 port。

## Common gotchas（常见坑）

- **Classic vs Vite：** Classic Remix 使用 `remix.config.js`；新版 Remix（v2+）使用 Vite，会被检测为 `vite` type，而不是 `remix`。`remix` type 专用于仍有 `remix.config.*` file 的 classic Remix projects。
- **Remix v1 vs v2 dev server：** v2 中的 `remix dev` 会启动一个 Express-based dev server 并 bind port；v1 中的 `remix dev` 只是 watcher（没有 server）。Polish 需要 v2+ dev server bind port 并响应 reachability probes。
- **Remix on Vite inherits Vite's port：** 当 Remix 运行在 Vite 上（没有 `remix.config.*`）时，default port 是 5173（Vite default），不是 3000。该情况由 `vite` recipe 处理，而不是这里。
