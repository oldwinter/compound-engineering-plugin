---
name: ce-polish
description: "启动 dev server，在 browser 中打开 feature，并一起迭代 improvements。仅手动调用：输入 /ce-polish 运行。"
disable-model-invocation: true
argument-hint: "[PR number、branch name，或留空使用 current branch]"
---

# Polish（打磨）

启动 dev server，在 browser 中打开 feature，并迭代。用户使用 feature，指出哪里 feels off，然后进行修复。

## Phase 0：Get on the right branch（切到正确分支）

1. 如果提供了 PR number 或 branch name，check it out（先 probe existing worktrees）。
2. 如果为空，使用 current branch。
3. 验证 current branch 不是 main/master。

## Phase 1：Start the dev server（启动 dev server）

### 1.1 Check for `.claude/launch.json`（检查 `.claude/launch.json`）

运行 `bash scripts/read-launch-json.sh`。如果找到 configuration，使用它；用户已经告诉我们如何启动 project。

### 1.2 Auto-detect（没有 launch.json 时自动检测）

运行 `bash scripts/detect-project-type.sh` 识别 framework。

按 type 路由到匹配的 recipe reference，获取 start command 和 port defaults：

| Type | Recipe |
|------|--------|
| `rails` | `references/dev-server-rails.md` |
| `next` | `references/dev-server-next.md` |
| `vite` | `references/dev-server-vite.md` |
| `nuxt` | `references/dev-server-nuxt.md` |
| `astro` | `references/dev-server-astro.md` |
| `remix` | `references/dev-server-remix.md` |
| `sveltekit` | `references/dev-server-sveltekit.md` |
| `procfile` | `references/dev-server-procfile.md` |
| `unknown` | 询问用户如何启动 project |

对于需要 package manager 的 framework types，运行 `bash scripts/resolve-package-manager.sh`，并把结果 substitute 到 start command 中。

用 `bash scripts/resolve-port.sh --type <type>` resolve port。

### 1.3 Start the server（启动 server）

在后台启动 dev server，将 output log 到 temp file。Probe `http://localhost:<port>` 最多 30 秒。如果没有起来，展示 log 最后 20 行并询问用户如何处理。

### 1.4 Open in browser（在 browser 中打开）

加载 `references/ide-detection.md` 获取 env-var probe table。使用 IDE 的机制打开 browser（Claude Code -> `open`，Cursor -> Cursor browser，VS Code -> Simple Browser）。

告诉用户：
```
Dev server running on http://localhost:<port>
Browse the feature and tell me what could be better.
```

## Phase 2：Iterate（迭代）

这是 core loop。用户浏览 feature 并告诉你要改进什么。你修复它。重复直到用户满意。

- 当用户描述要 fix 的内容 -> 做 change，dev server 会 hot-reload
- 当用户要求 check 某处 -> 使用 `agent-browser` screenshot 或 inspect page
- 当用户说 done -> commit fixes 并停止

没有 checklist。没有 envelope。就是 conversation。

## References（参考）

Reference files（按需加载）：
- `references/launch-json-schema.md` — launch.json schema + per-framework stubs
- `references/ide-detection.md` — host IDE detection 和 browser-handoff
- `references/dev-server-detection.md` — port resolution documentation
- `references/dev-server-rails.md` — Rails dev-server defaults
- `references/dev-server-next.md` — Next.js dev-server defaults
- `references/dev-server-vite.md` — Vite dev-server defaults
- `references/dev-server-nuxt.md` — Nuxt dev-server defaults
- `references/dev-server-astro.md` — Astro dev-server defaults
- `references/dev-server-remix.md` — Remix dev-server defaults
- `references/dev-server-sveltekit.md` — SvelteKit dev-server defaults
- `references/dev-server-procfile.md` — Procfile-based dev-server defaults

Scripts（通过 `bash scripts/<name>` 调用）：
- `scripts/read-launch-json.sh` — launch.json reader
- `scripts/detect-project-type.sh` — project-type classifier
- `scripts/resolve-package-manager.sh` — lockfile-based package-manager resolver
- `scripts/resolve-port.sh` — port resolution cascade
