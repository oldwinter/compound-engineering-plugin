# Nuxt dev-server recipe（dev-server 配方，auto-detect fallback）

当 `detect-project-type.sh` 返回 `nuxt`，且没有 `.claude/launch.json` 可查询时加载。

## Signature（识别特征）

- 存在 `nuxt.config.js`、`nuxt.config.mjs` 或 `nuxt.config.ts`
- `package.json` 包含 `nuxt` dependency

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

Default（默认）：`3000`。Nuxt respects `--port <port>` 和 `PORT` env var。Overrides 遵循 `references/dev-server-detection.md` 中的 cascade。

## Stub generation（stub 生成）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Nuxt dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

替换为 resolved package manager（`npm` / `pnpm` / `yarn` / `bun`）和 port。

## Common gotchas（常见坑）

- **Nitro server engine：** Nitro（Nuxt 的 server engine）会在 Nuxt 背后添加自己的 dev server；polish 只关心 Nuxt port。不要单独 probe Nitro internal port。
- **Port auto-increment：** 如果 3000 已被占用，Nuxt 会 auto-increment port（不同于会报错的 Next.js）。Polish 的 kill-by-port step 会在启动前 reclaim port，因此 auto-increment behavior 在实践中不会造成问题。
- **Nuxt 3 vs Nuxt 2：** Nuxt 3 使用 `nuxt.config.ts`，Nuxt 2 使用 `nuxt.config.js`；signature check 会检测二者。Dev-server command 和 port defaults 在两个版本中相同。
