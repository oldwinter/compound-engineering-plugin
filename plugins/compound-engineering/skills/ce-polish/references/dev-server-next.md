# Next.js dev-server recipe（Next.js dev-server 配方，auto-detect fallback）

当 `detect-project-type.sh` 返回 `next`，且没有 `.claude/launch.json` 可查询时加载。

## Signature（识别特征）

- 存在 `next.config.js`、`next.config.mjs`、`next.config.ts` 或 `next.config.cjs`
- `package.json` 包含 `next` dependency

## Start command（启动命令）

Standard（标准）:

```bash
npm run dev
```

也有效（读取 `package.json` scripts，确认项目使用哪一个）：

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

Default（默认）：`3000`。Next.js respects `-p <port>` / `--port <port>` 和 `PORT` env var。Overrides 遵循 `references/dev-server-detection.md` 中的 cascade。

## Turbopack（Turbopack）

Next.js 14+ 支持 `--turbo`（15+ 将其设为默认）。如果 `package.json` 中的 `dev` script 包含 `--turbo`，保留它。Turbopack 会改变 reload behavior，但不会改变 port 或 URL conventions。

## Stub generation（stub 生成）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

替换为 resolved package manager（`npm` / `pnpm` / `yarn` / `bun`）和 port。

## Common gotchas（常见坑）

- **App Router vs Pages Router：** dev-server behavior 相同；polish 不关心。Checklist generation（Unit 5）会关心，因为 `app/` 和 `pages/` 中的 pages 是不同 surfaces。
- **Monorepo roots：** 在 pnpm/Turborepo monorepo 中，root 处的 `npm run dev` 通常会 fan out 到多个 packages。用户应在 `.claude/launch.json` 中把 `cwd` 设置为具体 Next app（`cwd: "apps/web"`）。
- **Env loading：** Next 会自动加载 `.env.local`；polish 不需要 export 它。
