# Handoff（交接）

本内容在 Phase 4 开始时加载，也就是 requirements document 写入之后。

---

#### 4.1 呈现下一步选项

Phase 4 菜单的可见选项数量会随状态变化：没有 requirements doc 时隐藏 review 和 Proof 选项，`OUTPUT_FORMAT=html` 也隐藏 review 选项（ce-doc-review 今天是 markdown-only），未解决的 `Resolve Before Planning` 会隐藏 `Plan implementation` 和 `Build it now`，direct-to-work gate 失败会隐藏 `Build it now`。统计当前状态下的可见选项，并据此选择渲染模式：

- **4 个或更少可见选项：** 使用平台 blocking question tool（Claude Code 中的 `AskUserQuestion`；若 schema 未加载，先用 `ToolSearch` 和 `select:AskUserQuestion` 调用；Codex 中的 `request_user_input`；Gemini 中的 `ask_user`；Pi 中的 `ask_user`（需要 `pi-ask-user` extension））。这是默认路径。
- **5 个或更多可见选项：** 在聊天中渲染为编号列表。这是窄的 option-overflow fallback；删减选项会隐藏合法选择（plan、review、Proof、build、refine、pause 都是不同 destination）。加入接受自由文本输入的提示（"Pick a number or describe what you want."），让编号列表保留 blocking tool 的 open-endedness。

绝不要静默跳过问题。

如果 `Resolve Before Planning` 包含任何 items：
- 默认现在逐个询问 blocking questions
- 如果用户明确仍要继续，先将每个剩余 item 转换为明确 decision、assumption，或 `Deferred to Planning` question
- 如果用户选择暂停，将 handoff 呈现为 paused 或 blocked，而不是 complete
- 只要 `Resolve Before Planning` 仍非空，就不要提供 `Plan implementation` 或 `Build it now` 选项

下面两个 preamble 中，"Pick a number or describe what you want." 提示仅适用于 numbered-list mode。使用 blocking tool 时，省略该行，并将剩余 stem 作为问题传入。

**Path format（路径格式）：** 聊天输出中的文件引用使用 absolute paths；relative paths 在多数终端中不会自动链接为可点击项。

**没有 blocking questions 剩余时的 preamble：**

```
Brainstorm complete.

Requirements doc: <absolute path to requirements doc>  # omit line if no doc was created

What would you like to do next? (Pick a number or describe what you want.)
```

**仍有 blocking questions 且用户想暂停时的 preamble：**

```
Brainstorm paused. Planning is blocked until the remaining questions are resolved.

Requirements doc: <absolute path to requirements doc>  # omit line if no doc was created

What would you like to do next? (Pick a number or describe what you want.)
```

仅呈现适用选项。重新编号，让可见选项从 1 开始保持连续。

1. **Plan implementation with `ce-plan` (Recommended)** - 转入 `ce-plan` 进行结构化 implementation planning。仅当 `Resolve Before Planning` 为空时显示。
2. **Agent review of requirements doc with `ce-doc-review`** - 分派 reviewer agents 检查 requirements doc。
3. **Publish to Proof — shareable link** - 将 requirements doc 发布到 Proof，得到可阅读、评论或分享的链接。
4. **Start `/ce-work` directly** - 仅对 lightweight scope 显示。
5. **Ask more clarifying questions** - 继续 brainstorm。
6. **Pause** - 停在当前 doc。

**Post-review nudge（仅后续轮次）：** 如果用户在本 session 已运行 `ce-doc-review`，且 residual P0/P1 findings 仍未处理，在菜单旁添加一行 prose nudge（例如："Document review flagged 2 P1 findings you may want to address — pick \"Agent review of requirements doc\" to run another pass."）。按 label 引用选项，不要按编号：当 `Resolve Before Planning` 隐藏 `Plan implementation` 和 `Build it now` 时，菜单会重新编号，硬编码选项编号可能指向错误动作。不要添加单独菜单选项；复用现有 agent-review 选项。当 `OUTPUT_FORMAT=html` 时抑制该 nudge；agent-review 选项在该模式下隐藏，nudge 会指向不存在的动作。

#### 4.2 处理所选选项

选择可以是字面 option label（用户输入 label 或接近的 paraphrase）或选项编号。编号要匹配当前已渲染（post-trim）列表。无法匹配选项、也没有描述替代动作的自由文本输入，应视为 clarification；继续追问，而不是猜测。

**如果用户选择 "Plan implementation with `ce-plan` (Recommended)"：**

立即在当前 session 加载 `ce-plan` skill。当存在 requirements document 时传入其 path；否则传入已 finalized brainstorm decisions 的简洁摘要。当 Phase 1.1 grounding scout 产出了 dossier 且文件仍存在时，也传入其 path（`/tmp/compound-engineering/ce-brainstorm/<run-id>/grounding.md`）：它给 planning 提供带 `file:line` pointers 的 verified quotes，可从那里开始而不是重新扫描 repo。不要先打印 closing summary。

**如果用户选择 "Agent review of requirements doc with `ce-doc-review`"：**

Load the `ce-doc-review` skill，并将 requirements document path 作为 argument 传入。当 ce-doc-review 返回 "Review complete" 后，回到 Phase 4 options 并重新渲染菜单（doc 可能已变更，因此重新评估 `Resolve Before Planning`、direct-to-work gate 和 residual findings）。如果 residual P0/P1 findings 仍未处理，在菜单上方包含 post-review nudge。不要显示 closing summary。

**如果用户选择 "Build it now with `ce-work` (skip planning)"：**

立即在当前 session 加载 `ce-work` skill，并使用 finalized brainstorm output 作为 context。如果存在 compact requirements document，则传入其 path。不要先打印 closing summary。

**如果用户选择 "More clarifying questions to sharpen the doc"：** 返回 Phase 1.3（Collaborative Dialogue），继续一次一个地向用户提出 clarifying questions，进一步细化 scope、edge cases、constraints 和 preferences。持续到用户满意后，再返回 Phase 4。不要显示 closing summary。

**如果用户选择 "Publish to Proof — shareable link"：** 加载 `ce-proof` skill publish requirements doc。传入：
- **source file：** `docs/brainstorms/YYYY-MM-DD-<topic>-requirements.md`
- **doc title：** `Requirements: <topic>`
- **mode：** publish/shareable link；local markdown file 保持 canonical，不做 sync-back side effect

**如果用户选择 "Open in browser"：** 显示 `.html` requirements file 的 absolute path，让用户可本地打开。若平台暴露 browser-opening primitive（例如 macOS 的 `open`、Linux 的 `xdg-open`、Windows 的 `start`），agent 可直接调用；否则打印 absolute path，让用户自行打开。显示路径（或打开浏览器）后，返回 Phase 4 options，让用户选择 follow-up action。

**如果用户选择 "Done for now"：** 显示 closing summary（见 4.3）并结束本 turn。

#### 4.3 Closing Summary（收尾摘要）

仅当本次 workflow 运行结束或 handoff 时使用 closing summary；返回 Phase 4 options 时不要使用。

在下面两个模板中，将 `<absolute path to requirements doc>` 替换为本次运行实际写入的文件路径：`OUTPUT_FORMAT=md` 时为 `.md`，`OUTPUT_FORMAT=html` 时为 `.html`。当 artifact 是 HTML 时，不要输出硬编码 `.md` path，否则 closing summary 会指向一个从未写入的文件。

完成且准备 planning 时，显示：

```text
Brainstorm complete!

Requirements doc: <absolute path to requirements doc>  # omit line if no doc was created

Key decisions:
- [Decision 1]
- [Decision 2]

Recommended next step: `ce-plan`
```

如果用户在 `Resolve Before Planning` 仍有内容时暂停，显示：

```text
Brainstorm paused.

Requirements doc: <absolute path to requirements doc>  # omit line if no doc was created

Planning is blocked by:
- [Blocking question 1]
- [Blocking question 2]

Resume with `ce-brainstorm` when ready to resolve these before planning.
```
