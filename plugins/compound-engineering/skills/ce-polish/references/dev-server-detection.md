# Dev-server port detection（dev-server 端口检测）

Port resolution 通过 `scripts/resolve-port.sh` 运行。本文件说明 probe order、framework defaults，以及与 `test-browser` skill inline cascade 的 intentional divergences。

此 cascade **仅在** `.claude/launch.json` 不存在，或 resolved configuration 没有 `port` 字段时运行。当 `launch.json` 指定 port 时，原样使用它并完全跳过此 cascade。

## Priority order（优先级顺序）

1. **Explicit `--port` flag** -- 如果 caller 传入 `--port <n>`，直接使用它。
2. **Framework config files** -- 扫描 `next.config.*`、`vite.config.*`、`nuxt.config.*`、`astro.config.*`，使用保守 regex 只匹配 numeric literal port values。刻意不匹配 variable references（`process.env.PORT`、`getPort()`）。
3. **Rails `config/puma.rb`** -- grep `port <n>`。
4. **`Procfile.dev`** -- 扫描 web line 中的 `-p <n>` / `--port <n>` / `-p=<n>` / `--port=<n>`。
5. **`docker-compose.yml`** -- 使用 line-anchored grep 匹配 `"<n>:<n>"` port mapping patterns。不是完整 YAML parsing。
6. **`package.json`** -- 扫描 `dev`/`start` scripts 中的 `--port <n>` / `-p <n>` / `--port=<n>` / `-p=<n>`。
7. **`.env` files** -- 按 override order 检查：`.env.local` -> `.env.development` -> `.env`（first hit wins）。解析 `PORT=<n>` 时会 strip quotes 并 truncate comments。
8. **Framework default lookup table** -- 见下表。

## Framework defaults（Framework 默认值）

| Framework（框架） | Default port（默认端口） |
|-----------|-------------|
| Rails | 3000 |
| Next.js | 3000 |
| Nuxt | 3000 |
| Remix (classic) | 3000 |
| Vite | 5173 |
| SvelteKit | 5173 |
| Astro | 4321 |
| Procfile | 3000 |
| Unknown | 3000 |

## Sync-note block（同步说明块）

`resolve-port.sh` 与 `test-browser` skill 的 inline cascade 目的重叠，但在三个具体方面不同。这些 divergences 是 intentional 的；未理解 rationale 前，不要为了让二者一致而“修复”其中一个。

**(a) 对 `.env` values strip quotes。** `resolve-port.sh` 会从 `PORT=` values 中移除外围 `"` 和 `'`（因此 `PORT="3001"` 会解析为 `3001`）。`test-browser` inline cascade 不会 strip quotes。Script version 对真实世界中常见 quoted `.env` files 更健壮。

**(b) 对 `.env` values strip comments。** `resolve-port.sh` 在 trim whitespace 后会从 `#` 处截断（因此 `PORT=3001 # dev only` 会解析为 `3001`）。`test-browser` inline cascade 不会 strip comments。理由相同：真实 `.env` files 经常包含 inline comments。

**(c) 移除 `AGENTS.md`/`CLAUDE.md` grep。** `resolve-port.sh` 不会扫描 instruction files 中的 port references。`test-browser` inline cascade 会扫描。Instruction files 包含自然语言，可能在与 dev server 无关的 contexts（documentation、examples、troubleshooting）中提到 ports，产生难以 debug 的 false positives。Framework config files 和 `.env` 是更可靠的 source of truth。
