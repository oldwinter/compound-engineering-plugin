# Procfile / Overmind dev-server recipe（dev-server 配方，auto-detect fallback）

当 `detect-project-type.sh` 返回 `procfile`，且没有 `.claude/launch.json` 可查询时加载。带 `bin/dev` 的 Rails apps 优先于 bare Procfile path（见 `dev-server-rails.md`）。

## Signature（识别特征）

- repo root 存在 `Procfile` 或 `Procfile.dev`
- **不存在** `bin/dev`（如果存在，使用 Rails recipe）

## Start command（启动命令）

可用时优先使用 `overmind`：它处理 socket files，支持 per-process hot-restart，并且是 multi-process dev 的 community default：

```bash
overmind start -f Procfile.dev
```

当未安装 `overmind` 时 fallback 到 `foreman`：

```bash
foreman start -f Procfile.dev
```

如果二者都缺失，询问用户 start command，而不是猜测。

## Port（端口）

Default（默认）：`3000`。Procfile-based projects 会在 `Procfile.dev` 中列出 processes，因此 authoritative port 来自 `web:` line：

```
web: bundle exec puma -p 3000 -C config/puma.rb
worker: bundle exec sidekiq
```

解析 `web:` line 中的 `-p <n>` 或 `--port <n>`。如果二者都不存在，fall through 到 `references/dev-server-detection.md` 中的 cascade。

## Stub generation（stub 生成）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Overmind dev",
      "runtimeExecutable": "overmind",
      "runtimeArgs": ["start", "-f", "Procfile.dev"],
      "port": 3000
    }
  ]
}
```

如果用户机器上没有 `overmind`，替换为 `foreman`；stub 表示用户将运行什么，而不是 canonical recipe。

## Common gotchas（常见陷阱）

- **Socket files：** `overmind` 默认把 socket 写入 `.overmind.sock`。Polish 的 kill-by-port logic 会 reclaim port，但不会清理 socket。如果 overmind 已经运行，而 polish 重启它，新 process 可能会因 "connection refused" 失败，直到 stale socket 被移除。需要时，`OVERMIND_SOCKET` env var 可以把 socket redirect 到 per-run path。
- **Procfile vs Procfile.dev：** production 和 development Procfiles 经常不同。Polish 始终优先使用 `Procfile.dev`。
- **Multiple web processes：** 一些 Procfiles 会把 web traffic 拆到多个 processes（API + frontend）。Polish 只能打开一个 URL；使用 multi-web setups 的用户应明确 author `.claude/launch.json`，选择哪个 process 是 polish 的 "the dev server"。
