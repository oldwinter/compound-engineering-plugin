# 中文翻译术语表

本文件记录中文版本的翻译约定，用于保持 README、docs、skills、agents 和 marketplace 文案一致。

## 保留英文的专有名词

以下内容保持原文，不翻译：

- 产品、平台、组织和人名：Compound Engineering、Every、EveryInc、Claude Code、Codex、Cursor、GitHub Copilot、Copilot CLI、Factory Droid、Qwen Code、OpenCode、Pi、Gemini CLI、Kiro CLI、Windsurf、Proof、Riffrec、Spiral CLI、XcodeBuildMCP、Figma、Slack、Bun、TypeScript、Ruby、Rails、DHH、37signals、Ankane。
- 命令、路径、包名、仓库名和配置键：`/ce-*`、`ce-*`、`@every-env/compound-plugin`、`EveryInc/compound-engineering-plugin`、`STRATEGY.md`、`docs/brainstorms/`、`docs/plans/`、`docs/solutions/`、`docs/specs/`、`output:html`、`CODEX_HOME`、`COMPOUND_PLUGIN_GITHUB_SOURCE`。
- 协议、URL、API 名、变量名、JSON/YAML 键、license 名称和法律表达。

## 统一译法

| English | 中文 |
|---------|------|
| agent | agent |
| subagent | subagent |
| skill | skill |
| plugin | plugin |
| marketplace | marketplace |
| target | target |
| converter | converter |
| writer | writer |
| bundle | bundle |
| compound engineering | compound engineering 方法 |
| learning / learnings | learning / learnings |
| solution doc | solution doc |
| pattern doc | pattern doc |
| brainstorm | brainstorm |
| plan | plan |
| code review | code review |
| document review | document review |
| review persona | review persona |
| confidence gating | confidence gating |
| confidence anchor | confidence anchor |
| headless mode | headless mode |
| beta skill | beta skill |
| workflow | workflow |
| worktree | worktree |
| release automation | release automation |
| release notes | release notes |
| telemetry | telemetry |
| analytics | analytics |

## 文风

- 面向用户的安装、使用和 troubleshooting 文案使用简洁中文。
- 面向 agent 的操作约定保持命令式、可执行；不要弱化 "must / do not / required"。
- 不翻译代码块里的命令和示例输出；只在注释或说明性文字中翻译自然语言。
- Markdown 链接目标、标题锚点相关路径和表格中的命令名保持不变。
- JSON/YAML 中只翻译自然语言描述字段，保留机器字段、枚举值、关键字和版本号。
