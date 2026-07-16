# 在 Cline 中安装 Compound Engineering

Cline 通过原生 **skills** 发现机制加载 CE，也就是本 repository 的 `skills/` 下那些包含 `SKILL.md` 的 skill 目录。无需 Bun converter，也无需生成副本。

## 扩展（VS Code、Cursor、JetBrains）

1. 在编辑器中安装 [Cline 扩展](https://docs.cline.bot/getting-started/installing-cline)。
2. 启用 **Settings -> Features -> Enable Skills**。
3. 将 CE skills link 到全局或当前 project（见下文）。
4. 启动新的 Cline task。当 `ce-brainstorm`、`ce-plan` 等 skill 的 description 与你的 request 匹配时，Cline 就会显示它们。

## 安装 skills

Clone 本 repository 后运行：

```bash
# Global (~/.cline/skills/) — available in every project
./compound-engineering-plugin/.cline/scripts/install-skills.sh --global

# Project (.cline/skills/ in the current directory)
./compound-engineering-plugin/.cline/scripts/install-skills.sh --project
```

该 script 会创建 symlink，让 Cline 直接读取 checkout 中的 skill 目录。执行 `git pull` 后，如果 skill 目录名称发生变化，请重新运行 script 以刷新 links。它只会创建或替换 CE 自有的 symlink（即 target 位于当前 checkout 的 `skills/` tree 下）；如果已有 `~/.cline/skills/<name>` 指向你自己的 skill、某个 fork 或其他 checkout，则不会触碰。默认安装也只会移除 CE 自有的 manual-only symlink。

标记为 `disable-model-invocation: true` 的 skills（例如 `ce-dogfood`、`ce-polish`、`ce-setup`）默认**不会**建立 symlink。Cline 会根据 description 匹配自动激活 skill，且没有 manual-only gate，因此 link 这些 skills 可能导致意外触发。你需要显式启用，才能使用对应的 slash commands：

```bash
./compound-engineering-plugin/.cline/scripts/install-skills.sh --global --include-manual
```

`--include-manual` 会为 manual-only skills 建立 symlink，从而启用 `/ce-polish` 等 commands；但请注意，description 匹配时 Cline 仍可能自动激活它们。如果你不需要在 Cline 中使用这些 workflows，请省略该 flag。

## 固定 release 版本

Clone 要使用的 tag，然后对该 checkout 运行安装 script：

```bash
git clone --branch compound-engineering-vX.Y.Z --depth 1 \
  https://github.com/oldwinter/compound-engineering-plugin.git
./compound-engineering-plugin/.cline/scripts/install-skills.sh --global
```

将 `X.Y.Z` 替换为 [releases 页面](https://github.com/oldwinter/compound-engineering-plugin/releases)中的 tag。

## 本地开发

在 working copy 中运行：

```bash
/path/to/compound-engineering-plugin/.cline/scripts/install-skills.sh --global
```

编辑 `skills/` 下的 skills，然后启动新的 Cline task 以加载文案改动。

## 卸载

从 `~/.cline/skills/` 或 `.cline/skills/` 中移除 CE skill symlinks。Skill directory name 与 `skills/` 下的目录名称一致（例如 `ce-brainstorm`、`ce-plan`）。

## Cline CLI

Cline CLI 支持单独安装 `AgentPlugin`，用于提供 custom tools 和 hooks。CE skills 无需 CLI plugin 即可工作。在 terminal 中使用 Cline 时，请运行上面的 skills 安装 script。
