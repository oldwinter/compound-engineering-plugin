# 用于 browser handoff 的 IDE detection

Polish 会尝试把正在运行的 dev-server URL hand off 给 IDE 的 embedded browser，让用户不用切换 context 就能测试。Detection 是 best-effort：失败时会降级为在 interactive summary 中打印 URL。

## Detection order（检测顺序）

按此顺序 probe environment variables，并在第一个 positive match 处停止。越靠前的 entries 越 specific；越靠后的 entries 是 general fallbacks。

| Order | Signal | IDE | Handoff method |
|-------|--------|-----|----------------|
| 1 | `CLAUDE_CODE` env var set（任意值） | Claude Code desktop | 打印 `claude-code://browser?url=http://localhost:<port>` 作为 clickable hint；Claude Code desktop app 会 intercept `claude-code://` URLs。 |
| 2 | `CURSOR_TRACE_ID` env var set | Cursor | 如果 Cursor 的 URL scheme 在用户版本中稳定，emit `cursor://anysphere.cursor-retrieval/open?url=...`；否则打印 URL，并提示在 Cursor 的 simple-browser view 中打开。 |
| 3 | `TERM_PROGRAM=vscode` 且没有 Cursor/Claude Code signal | Plain VS Code | 打印 URL，并附带提示：`Open in VS Code: Ctrl+Shift+P -> "Simple Browser: Show" -> paste URL`。 |
| 4 | 以上都不匹配 | Terminal / unknown IDE | 打印 URL。不尝试 handoff。 |

## 为什么用 env-var probe，而不是更复杂的方法

- Env vars 是 cross-platform（macOS、Linux、Windows/WSL）
- 它们 fail open：如果 probe 没有返回任何内容，polish 仍能工作
- 不需要任何 IDE API 或 socket connection
- 它们能表达“这个 shell 是否运行在已知 IDE 内”，无需猜测

## Codex 和其他 platforms

Codex（Claude Agent SDK、Antigravity CLI 等）尚未暴露 embedded-browser handoff。对这些 platforms，polish 会降级到 terminal branch（打印 URL）。当出现约定后，在上方 detection table 中添加新行。

## Detection failure 永不致命

如果 environment probing 失败或返回 ambiguous results，polish 会原样打印 URL 并继续。此时 dev server 已经运行；用户始终可以把 URL copy-paste 到任意 browser。IDE handoff 是便利功能，不是 gate。

## Probe pattern（probe 模式，reference）

Skill 会 inline 使用这些 probes，而不是通过 shell script（无 state、无 parsing、一次性读取）。典型用法：

```
if [ -n "${CLAUDE_CODE:-}" ]; then
  IDE="claude-code"
elif [ -n "${CURSOR_TRACE_ID:-}" ]; then
  IDE="cursor"
elif [ "${TERM_PROGRAM:-}" = "vscode" ]; then
  IDE="vscode"
else
  IDE="none"
fi
```

不要在不同 variables 之间用 `||` 串联 probes：缺失 env var 必须解析为 "no signal"，而不是 "error"。在 `set -u` 下必须使用 `${VAR:-}` default-to-empty pattern。
