# `.claude/launch.json` schema（结构说明）

Polish 读取 repo root 下的 `.claude/launch.json`，以 resolve dev-server start command。该 schema 是 VS Code `launch.json` format 的 subset；选择它是因为 Claude Code、Cursor 和 VS Code 都能理解它，而且用户通常已经为了 editor integration 拥有一个。

## Top-level shape（顶层结构）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "<human label>",
      "runtimeExecutable": "<binary>",
      "runtimeArgs": ["<arg>", "<arg>"],
      "port": <number>,
      "cwd": "<optional, repo-relative>",
      "env": { "<key>": "<value>" }
    }
  ]
}
```

## Fields polish consumes（polish 会消费的字段）

| Field（字段） | Required（必需） | Purpose（用途） |
|-------|----------|---------|
| `name` | yes (when multiple configurations) | 当 array 有多个 entry 时用于 disambiguate。Polish 让用户按 `name` 选择。 |
| `runtimeExecutable` | yes | polish 启动的 binary（例如 `bin/dev`、`npm`、`overmind`、`bun`）。 |
| `runtimeArgs` | no | 传给 `runtimeExecutable` 的 arguments array。默认：空 array。 |
| `port` | yes | dev server 会监听的 port。Polish 会 probe `http://localhost:<port>` 的 reachability，并将其用于 IDE browser handoff。 |
| `cwd` | no | dev server 的 repo-relative working directory。默认：repo root。适用于 monorepos（`apps/web`、`packages/frontend`）。 |
| `env` | no | dev-server process 的 additional environment variables。默认：继承 polish 的 environment。 |

## Stub template（用户首次接受时写入）

当 polish auto-detects project type，且用户确认 "Save this as `.claude/launch.json`?" 时，polish 会写入一个由 detected type 派生的 minimal stub。这些 templates 刻意 hard-code 常见 defaults；用户之后可编辑。

### Rails stub（Rails stub，Rails 模板）

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

### Next.js stub（Next.js stub，Next.js 模板）

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

### Vite stub（Vite stub，Vite 模板）

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

### Procfile / Overmind stub（Procfile / Overmind stub，Procfile / Overmind 模板）

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

### Nuxt stub（Nuxt stub，Nuxt 模板）

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

### Astro stub（Astro stub，Astro 模板）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Astro dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 4321
    }
  ]
}
```

### Remix stub（Remix 模板）

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

### SvelteKit stub（SvelteKit 模板）

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

## Why a subset of VS Code's schema（为什么只采用 VS Code schema 的子集）

Polish 不使用 `type`、`request`、`console`、`stopOnEntry` 或其他 VS Code fields。包含它们无害；polish 会忽略它们；但 stub writer 永远不会添加它们。polish 关心的 fields 描述的是*如何在已知 port 上启动 long-running dev server*，这比 VS Code 用于 debug-stepping 的 surface 更小。

## Cross-IDE notes（跨 IDE 说明）

`.claude/launch.json` 还不是 Claude Code、Cursor、VS Code 和 Codex 之间完全统一的 standard。Polish 优先使用 `.claude/launch.json`，因为：
- Claude Code、Cursor 和 VS Code 都能将它作为 launch config 读取
- 它位于干净的 repo-root trust boundary（user-authored，而非 auto-detected）
- 偏好 `.vscode/launch.json` 的用户可以手动 symlink 或 mirror 这两个文件

如果出现 cross-IDE standard（例如 `.workspace/launch.json`），stub writer 和 reader 可替换 paths，而无需触及 skill 的其余部分。
