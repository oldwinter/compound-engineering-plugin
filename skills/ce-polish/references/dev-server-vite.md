# Vite dev-server recipe（dev-server 配方，auto-detect fallback）

当 `detect-project-type.sh` 返回 `vite`，且没有 `.claude/launch.json` 可查询时加载。

## Signature（识别特征）

- 存在 `vite.config.js`、`vite.config.ts`、`vite.config.mjs` 或 `vite.config.cjs`

## Start command（启动命令）

Standard（标准）:

```bash
npm run dev
```

`package.json` 中的 `dev` script 通常直接包装 `vite`。优先使用 lockfile 指示的 package manager（lockfile -> command mapping 见 Next.js recipe）。

## Port（端口）

Default（默认）：`5173`。Vite respects `--port <n>` 和 `VITE_PORT` env var。`references/dev-server-detection.md` 中的 cascade 会从 `package.json` scripts 获取 `--port`，并从 `.env*` 获取 `PORT`。

当请求的 port 已被占用时，Vite 的 `--strictPort` flag 会让 dev server fail，而不是递增到下一个可用 port。Polish 的 kill-by-port step 会在启动前 reclaim port，因此实践中 `strictPort` 不是问题；但如果用户禁用 port reclamation 并运行多个 Vite instances，除非在 `vite.config.ts` 中设置 `strictPort: true`，否则会看到 port auto-increment。

## Host binding（Host 绑定）

Vite 默认 bind 到 `127.0.0.1`。如果 polish 运行在 devcontainer 或 WSL 内，用户可能需要在 `runtimeArgs` 中设置 `--host 0.0.0.0`。如果这与 diff 相关，checklist 可以注明。

## Stub generation（stub 生成）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Vite dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 5173
    }
  ]
}
```

## Common gotchas（常见坑）

- **HMR websocket port：** Vite 的 HMR 使用单独 websocket，默认继承 dev-server port。如果项目在 `vite.config.ts` 中 pin `server.hmr.port`，polish 针对 dev-server port 的 reachability probe 仍能工作，但 embedded browser 可能需要额外配置才能连接 HMR。
- **Framework on top of Vite：** SvelteKit、SolidStart、Qwik City 和 Astro 都使用 Vite，但会添加自己的 dev scripts。`vite` signature 会捕获它们，`npm run dev` 对它们都是正确命令。不同 default ports 会适用（SvelteKit: 5173、Astro: 4321、Qwik: 5173）；依赖 cascade 从 `package.json` 或 `.env` 获取实际 port。
