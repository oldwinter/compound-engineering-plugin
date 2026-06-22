# SvelteKit dev-server recipe（dev-server 配方，auto-detect fallback）

当 `detect-project-type.sh` 返回 `sveltekit`，且没有 `.claude/launch.json` 可查询时加载。

## Signature（识别特征）

- 存在 `svelte.config.js`、`svelte.config.mjs` 或 `svelte.config.ts`
- `package.json` 包含 `@sveltejs/kit` dependency

## Start command（启动命令）

Standard（标准）:

```bash
npm run dev
```

`package.json` 中的 `dev` script 通常通过 SvelteKit 包装 `vite dev`。也有效（读取 `package.json` scripts，确认项目使用哪一个）：

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

Default（默认）：`5173`（继承自 Vite）。SvelteKit respects `--port <port>` flag 和 `vite.config.ts` 中的 Vite `server.port` config。Overrides 遵循 `references/dev-server-detection.md` 中的 cascade。

## Stub generation（stub 生成）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "SvelteKit dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 5173
    }
  ]
}
```

替换为 resolved package manager（`npm` / `pnpm` / `yarn` / `bun`）和 port。

## Common gotchas（常见坑）

- **Vite under the hood：** SvelteKit 内部使用 Vite；相同 port default（5173），相同 HMR behavior。`sveltekit` type 存在，是因为 `svelte.config.js` 比通用 `vite.config.ts` 是更精确的 signal，可让 polish 生成 SvelteKit-specific stub name 和 label。
- **Adapter does not matter for dev：** `adapter-auto`、`adapter-node`、`adapter-static` 和其他 adapters 都生成相同 dev server。Adapter 只影响 production build output。
- **`svelte.config.js` 是 primary signature：** `svelte.config.js` 在 SvelteKit projects 中总是存在，即使 `vite.config.ts` 也存在。这是区分 SvelteKit project 与 plain Vite project 的文件。
