# Compound Engineering 中文本地化档案

## 项目定位

- 上游项目：`EveryInc/compound-engineering-plugin`
- 中文 fork：`oldwinter/compound-engineering-plugin`
- 主要安装面：Claude Code plugin marketplace；其他 host 的原生 plugin manifest 或 native skills 目录
- 目标用户：希望直接使用中文工程工作流、skill 和参考文档的开发者
- 用户安装后实际读取的入口文件：`skills/*/SKILL.md`、各 skill 的 `references/`，以及 host 对应的 plugin manifest
- 不应宣传为中文版安装的入口：指向 `EveryInc/compound-engineering-plugin` 的上游安装命令

## 本地化目标

本 fork 是中文本地化发行版，不是逐句对照译文。翻译应让中文用户能直接安装、理解并运行 Compound Engineering，同时保持上游的工程语义、执行顺序、权限边界和跨 host 兼容性。

## 语气

- 面向开发者使用自然、直接的中文，保留 agent、skill、plugin、workflow、prompt、runtime、frontmatter 等常用术语。
- 操作步骤先给命令，再说明 host、session reload 和权限差异。
- 运行时约束要精确，不为追求中文化改写流程强度或安全边界。

## 术语表

| 英文 | 中文 | 备注 |
|---|---|---|
| skill | skill | 保留英文小写 |
| plugin | plugin | CLI 和 manifest 语境保留英文 |
| workflow | 工作流 | 命令名、文件名中保留英文 |
| runtime | runtime | 指安装后实际加载环境时保留英文 |
| upstream | 上游 | 指 EveryInc 官方仓库 |
| fork | fork | GitHub fork 语境保留英文 |
| grounding | grounding | 指基于仓库证据校验 claims 时保留英文 |
| blindspot pass | blindspot pass | 作为 skill 内部机制名称保留英文 |

## 不翻译清单

- 命令、参数、环境变量、URL、文件路径、包名、plugin 名、skill slug。
- YAML/JSON/TOML key、host manifest 字段和值域。
- 测试 fixture、golden string、schema、正则和执行器依赖的精确字符串。
- Canonical executable prompt contract；需要中文说明时，在英文 contract 前后添加说明，不改写 contract 本身。
- Model、tool、host 和 API 的公开名称。

## README 中文安装区块

README 顶部提供“安装中文版”区块，必须说明这是社区中文 fork，并使用 `oldwinter/compound-engineering-plugin` 作为 marketplace source。上游 `EveryInc/compound-engineering-plugin` 命令可保留作英文版说明，但不能标注为中文版安装入口。

当前同步基线：上游 commit `dd9b7921c9c80498eba84994ff1b8e1e81dbc1db`。

本批同步合并 `upstream/main` 从 `fe02f790` 到 `dd9b7921c9c80498eba84994ff1b8e1e81dbc1db` 的 302 个 commit（约 1,700 个文件）。保留上游 runtime behavior 与 restructured `docs/guides`、`ce-compound` 合并 `ce-compound-refresh` 后的新结构、open-vocabulary corpus-first 规则、`retire_when`/`framework_version` 约定、cross-model 结构化失败证据脚本、host manifests 升级与新 host metadata；runtime 入口继续使用已有中文本地化层，长篇 executable spec 与历史 solution 在冲突处保留权威上游英文，并补充中文导读。

## 同步后检查

- `git diff --check`
- `rg -n '^(<<<<<<<|=======|>>>>>>>)$' .`
- `bun test`
- 验证 plugin/skill 生成或一致性检查没有 drift。
- README 中文安装命令指向中文 fork，且安装后 runtime 读取 `skills/*/SKILL.md`。
- 新增 user-facing 英文已翻译，代码、测试和执行敏感字符串未被误翻。

## 项目特殊规则

- 上游同时支持 Claude Code、Codex、Cursor、Cline、Kimi、Grok、Devin、Pi 等 host；翻译不得改变各 host 的 manifest、权限映射或安装语义。
- `skills/` 是 runtime source of truth；`docs/skills/` 是面向读者的镜像说明，两者涉及同一新增能力时应保持语义一致。
- 长篇历史 plan、solution 和 spec 默认保留上游原文；只有实际运行入口、当前安装说明或用户直接依赖的文档需要增量翻译。
- Codex 只注入每个 SKILL.md 的前 8000 字节（CRLF 校正后），`tests/codex-skill-prompt-budget.test.ts` 守住该上限。上游正文逼近上限时不得为插入中文导读越过门禁：`ce-compound`、`ce-product-pulse` 只保留单行 fork 标记，`ce-doc-review`、`ce-optimize` 余量分别仅 38 与 30 字节，SKILL.md 保持上游原文，中文说明留在各自 `references/`。
