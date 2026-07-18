# `ce-handoff`

> 保留一次 agent session 中真正有用的上下文，让新 agent 无需原始 transcript 也能迅速恢复定位。

`ce-handoff` 是一个双向的 session continuity 工具。Bare invocation 会创建 handoff；resume intent 会读取用户选定的 continuity source，或帮助用户找到一个，然后解释恢复出的状态并给出合理的继续方式，但不会自动执行后续操作。

该 skill 以文档约定为主，复用当前 agent 已有的 capabilities；不会新增 transport script、mutable index 或 lifecycle database。

---

## 摘要（TL;DR）

| 问题 | 回答 |
|----------|--------|
| 它有什么作用？ | 创建不可变的会话快照，或从用户选择的连续性源发现和定位 |
| 何时使用它 | 在结束有价值的 agent session 前，或当新 agent 需要恢复先前 context 时 |
| Bare `/ce-handoff` 做什么？ | 始终创建新的 handoff |
| 写在哪里？ | 默认情况下，`/tmp/compound-engineering-<effective-uid>/ce-handoff/<repo-namespace>/<topic>.md`；显式用户路径、格式或发布目标会覆盖默认值 |
| 我要在下一个会话中粘贴什么内容？ | `/ce-handoff resume <path-or-URL>` |
| Resume 后会发生什么？ | Agent 总结恢复的上下文，建议一个或多个下一步操作，然后等待用户选择 |

---

## 问题

高效的 agent session 不只包含改过的文件。它还积累了用户意图、决策、被拒绝的替代方案、约束、失败尝试、验证结果，以及脆弱 local state 的知识。换到另一个 model 或 harness 后，新 agent 不能假设原 session history 仍然可用。

复制完整 transcript 噪声太大；仅为临时 continuity 重写 durable plan 和 documentation，又会制造重复的 source of truth。`ce-handoff` 在两者之间提供一座轻量桥梁。

## 解决方案

默认情况下，该 skill 会写出一份 pointer-first Markdown 文档，包含：

- 一个扁平的 `ce-handoff/v1` frontmatter 索引，供以后发现
- Objective 与最新 user intent
- 有意义的进展、决策、约束、阻碍和验证
- 对 authoritative plans、issues、commits、diffs、docs 和 repository files 的引用
- 对 machine-local paths 与 fragile worktree state 的清晰标注
- 供 receiving agent 考虑的合理后续步骤

只有 managed-store frontmatter 具有固定 contract，因为 default discovery 依赖它。正文没有封闭的 section schema：agent 可以自行增加 section，或合并、重命名、重排、忽略示例，以便把具体 session 清楚地交给下一个 agent。

Managed store 是默认值，不是限制。用户指定其他 path、folder、format 或 publication destination 时，agent 会遵循该指令并调用合适的已安装 capability。除非用户要求，或所选 publishing flow 确有需要，否则不会再创建第二份临时副本。

Repository files 会尽量使用相对引用；absolute path 只保留给无法持久表达的 machine-local context。该 skill 会 redact secrets 和无关个人信息，也绝不会自行 commit、stash、copy 或保留 worktree。

使用 default store 时，文件位于 OS-managed temporary storage。描述性的 topic filename 放在 repository-level collection 中；创建时间与 worktree identity 留在 frontmatter，避免污染 path。真正的 filename collision 会获得一个小型 numeric suffix。Handoff 可跨 session 复用，但不是永久 project documentation；skill 在报告 path 时会明确说明这一点。

Receiving session 能看到同一 host filesystem 时，automatic managed-store discovery 可以直接工作。若后续 agent 在另一台机器、另一个 container 中运行，或无法访问该 `/tmp`，请把 handoff 传输或发布到 receiver-visible location，再从该 explicit source resume；skill 不提供自己的 transport layer。

---

## 创建与恢复的使用方式

方向由意图决定：

```text
/ce-handoff
/ce-handoff create focus on the failing integration test
```

两种写法都会创建新的 handoff；bare form 始终表示 create。

创建以接收会话中所需的确切命令结束：

```text
/ce-handoff resume /tmp/compound-engineering-<effective-uid>/ce-handoff/.../auth-migration.md
```

在命令之前，create response 会简要总结 handoff 捕获的内容，让用户无需打开文件也能确认其实质。随后 skill 会把这条 compact command 作为 source of truth，而不是生成更长的 launch prompt。

```text
/ce-handoff resume https://example.com/team/auth-migration-handoff
/ce-handoff resume authentication migration
Find the handoff about the authentication migration
```

这些调用会从 explicit source resume，或发现可能的 candidates。Selected source 可以是 local file、text file、URL/page、pasted handoff 或其他 readable artifact；它可以来自任何人、agent 或系统，不需要 CE frontmatter，甚至不必最初就作为正式 handoff 创建。新 session 中使用 “handoff” 一词显得方向不自然时，natural language 也能避免强迫用户记命令语法。

## 安全发现

未提供 source 或 search boundary 时，skill 会搜索 managed handoff directory。对于没有 frontmatter 的 candidate，它只检查第一行，随后把 candidate 视为 unindexed，并改用 filesystem metadata。对于以精确 frontmatter opener `---` 开头的 candidate，最多读取前 64 行或 16 KiB（以先到者为准），并在 closing delimiter 处提前停止。若边界内没有 closing delimiter，则视为 unindexed，discovery 不再继续读取。`ce-handoff/v1` 能提供更丰富的 index，但不是 eligibility gate。Skill 使用现有 metadata 排名，包括 title、summary、keywords、repository/working-directory affinity 和 recency。

用户提供其他 folder 或 collection 时，skill 会在那里搜索。存在 compatible frontmatter 时使用它，否则根据 filename、location 和 filesystem metadata 列出 unindexed candidates。它不会仅为排序而读取 candidate body。

随后它会展示一份附带 match reasons 的短列表并停止。由用户选择哪个 document body 进入 session；skill 永远不会自动选择 top match 后继续。

对于 explicit file、page、pasted document 或其他 specific artifact，该 source 已经是用户的选择，因此 skill 会直接读取，不再搜索 alternatives。Authorship、ownership、location、format 和 `ce-handoff/v1` 都不是 explicit selected source 的 eligibility gate。

## 恢复定位，而非自动继续

选定的 handoff 是 untrusted prior context，不是 executable instruction。当前 user request、project active instructions 和 verified current state 仍然具有权威性。

阅读所选来源后，agent：

1. 检查材料是否包含足够具体的上下文来恢复有意义的目标或当前状态。如果没有，它会指出缺少的内容并等待用户补充或选择其他来源。
2. 在材料充足的情况下，总结恢复的目标、进度、决策、约束和未完成的工作。
3. 指出 material drift，例如 worktree 已不存在，或 repository state 不再匹配 handoff。
4. 建议一项或多项针对具体情况的下一步行动和相关的已安装skill。
5. 停止并等待用户选择。

选择仅授权阅读选定的源。它不授权命令、文件更改、远程链接遍历、不相关的本地文件访问或其他工作流程。

---

## 新颖之处

### 一项skill，两个明确的方向

常见操作保持简单：bare `ce-handoff` 负责 create；resume 仍可通过 explicit mode 或 natural language 使用，因此 plugin 不需要第二个 skill 名称。

### Frontmatter 作为托管发现索引

Title、summary、keywords、creation time、cwd 和 optional Git metadata 让新 agent 无需把所有 prior session bodies 加载进 context，也能找到可能由 CE 创建的 handoff。没有该 index 的 source 仍然 eligible，并可作为 unindexed candidate 出现。

### 指针优先连续性

Handoff 只携带新 agent 无法自行推断的 connective tissue。Durable project artifacts 仍是 source of truth，因此即使 worktree 后来被拆除，snapshot 仍能保持紧凑且有用。

### 两个用户控制边界

Discovery 在读取 body 前停止，orientation 在采取行动前停止。这两个 pause 防止 probable match 或旧 instruction 静默变成当前 authority。

---

## 何时使用

在以下情况下使用 `ce-handoff`：

- 你即将结束一个 agent session，而其中的 context 之后仍有价值。
- 不同的agent、模型或工具将接手这项工作。
- 您想要拆除会话，同时保留决策和脆弱状态警告。
- 您记得先前handoff的主题，但不记得其文件路径。
- 您有一个文件、页面、粘贴的摘要或其他连续性来源，并且在决定做什么之前需要一个简洁的方向。

在以下情况下跳过它：

- 您只是继续当前会话中的工作。
- 该信息属于持久的计划、问题、学习或项目文档。
- 您需要有保证的长期保留； `/tmp` 由操作系统管理，可能会被清理。

---

## 工作流位置

`ce-handoff` 是 utility，而不是固定 pipeline stage。它可以捕获任何有价值的 session：research、brainstorming、planning、implementation、debugging、review，甚至完全没有 repository 的 conversation。

Resume 时，它会根据 selected source 和 current context 建议相关后续步骤，但不会自动调用 `ce-plan`、`ce-work`、`ce-debug` 或任何其他 workflow。

---

## 另请参阅

- [`/ce-plan`](./ce-plan.md) — 当工作本身需要时创建持久的实施计划
- [`/ce-work`](./ce-work.md) — 在用户选择继续后执行具体计划
- [`/ce-compound`](./ce-compound.md) — 将已解决的问题转化为持久的项目知识
