# Rails dev-server recipe（Rails dev-server 配方，auto-detect fallback）

当 `detect-project-type.sh` 返回 `rails`，且没有 `.claude/launch.json` 可查询时加载。

## Signature（识别特征）

- `bin/dev` 存在且 executable
- `Gemfile` 存在

## Start command（启动命令）

```bash
bin/dev
```

`bin/dev` 是 Rails 7+ 的 "start everything"（web + assets watcher + optional workers）约定。它是一个 one-liner script，底层调用 `foreman start -f Procfile.dev`，因此如果 `bin/dev` 缺失或不可执行，`Procfile.dev` 是读取*实际* command 的 canonical place。

## Port（端口）

Default（默认）：`3000`。Overrides 遵循 `references/dev-server-detection.md` 中的 cascade：
1. `Procfile.dev` 的 `web:` line 可能包含 `-p <n>`
2. `config/puma.rb` 可能 bind 到 non-default port
3. `.env` / `.env.development` 中的 `PORT=<n>`
4. `AGENTS.md` / `CLAUDE.md` project instructions（项目说明）

## 为 `.claude/launch.json` 生成 stub

当用户接受 "Save this as `.claude/launch.json`?" 时，emit `launch-json-schema.md` 中的 Rails stub：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Rails dev",
      "runtimeExecutable": "bin/dev",
      "runtimeArgs": [],
      "port": 3000
    }
  ]
}
```

如果 cascade resolved 到非 3000 port，在写入前替换 stub 的 `port` 字段。

## Common gotchas（常见陷阱）

- **Bundler path：** 有些机器需要 `bundle exec bin/dev`。如果 `bin/dev` 因 load-path error 失败，fallback 到 `bundle exec bin/dev`。
- **Foreman vs overmind：** `Procfile` 和 `Procfile.dev` 经常同时存在。Rails 的 `bin/dev` resolves 到 `Procfile.dev`；如果项目明确使用 `overmind`，优先用 `overmind start -f Procfile.dev`（见 `dev-server-procfile.md`）。
- **SSL dev server：** 带 `--ssl` 的 `rails s` 会改变 URL scheme。Polish 的 reachability probe 使用 `http://`；使用 SSL dev servers 的用户应在 `.claude/launch.json` 中显式设置 `port`，并在 checklist 中注明 scheme。
