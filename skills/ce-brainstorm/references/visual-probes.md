# Visual Probes

当 brainstorm decision 通过看一个粗糙 artifact 比读 prose 更快判断时，使用 visual probes。Visual probe 是一次性 decision sketch，不是 prototype、implementation plan、UI spec 或 design deliverable；it is not a prototype, not implementation, not a design deliverable, and not a UI spec。

## Trigger

只有当下一个问题包含具体 visual decision 时，才使用本 reference：

- behavior shape："Which annotation or drawing behavior feels right?"
- layout shape："Which navigation structure matches the workflow?"
- flow shape："Where should this decision point sit?"
- state shape："Which empty/loading/error state communicates the right thing?"
- diagram shape："Which relationship or system boundary is clearer?"

不要把 visual probe 用于 product goals、scope boundaries、success criteria、evidence probes、tradeoff prose，或在 chat 中更容易讨论的 technical decisions。

## Offer

在 decision point 只询问一次。不要开启 session-wide mode。

可用时，使用平台的 blocking question tool 让用户 opt in（`AskUserQuestion`、`request_user_input`、`ask_user` 或 equivalent）。只有当不存在 interactive question tool 或 tool 报错时，才用 plain chat question。Opt-in 应有两个清晰选项：

- Visual sketch — 在 local browser 中创建粗糙选项
- Text description — 在 chat 中继续决策

使用这段措辞：

> This decision may be easier to judge visually. I can either sketch rough options in a local browser so you can react to the shape, or keep it in chat and describe the options textually, which is faster but lower-fidelity. Which do you prefer?

Text path 必须可信。如果无法用文字把 decision 讲清楚，就还没有理解到足以 sketch 的程度。

如果用户选择 text，继续在 chat 中推进，并且不要为同一个 decision 再次提供 visual path。如果用户选择 visual，继续下面流程。

## Visual Path

创建能回答当前问题的最低成本 artifact。优化目标是快速获得反馈，而不是 polished。

允许：

- rough behavior sketches
- low-fidelity wireframes
- state comparisons
- flow diagrams
- simple A/B/C visual contrasts
- 仅当 behavior 本身就是 decision 时，创建 disposable interaction demos

避免：

- polished branding
- final colors or typography
- component-library precision
- pixel-perfect layout
- production-like implementation
- unnecessary animation
- 会暗示 exact UI commitments 的细节

把 artifact 标为 directional。说明用户应该判断什么、忽略什么。

## Display Helper

当当前平台可以运行 bundled skill script 时，使用随附的 display-only helper：

- Helper：`scripts/visual-probe-server.js`
- 运行前相对已加载的 `ce-brainstorm` skill directory 解析 helper path。不要从用户 project CWD 解析。
- Start：`node <resolved-helper-path> start --root /tmp/compound-engineering/ce-brainstorm-visual/<run-id>`
- Start foreground：`node <resolved-helper-path> start --root /tmp/compound-engineering/ce-brainstorm-visual/<run-id> --foreground`
- Status：`node <resolved-helper-path> status --root /tmp/compound-engineering/ce-brainstorm-visual/<run-id>`
- Stop：`node <resolved-helper-path> stop --root /tmp/compound-engineering/ce-brainstorm-visual/<run-id>`

Helper 会创建 `screens/` 和 `state/`，serve `screens/` 中最新的 `.html` 文件，写入 `state/display-info.json`，并暴露 `/version` 供浏览器 poll screen changes。浏览器只在最新 screen 改变时 reload；不得基于 timer 持续 reload。`/version` polling 不算 activity，因此废弃的 browser tab 不会让 server 永远存活。Detached servers 会在可解析时监控 owning harness process，所有 servers 都会在 idle timeout 后退出。Helper 没有 click tracking，也没有 browser-to-agent event path。

如果 helper path 不可用，或平台无法干净展示 local URL，简短说明原因并使用 text path。不要为了补偿 brainstorm 期间的平台限制，而构建 custom event system 或 long-lived server。

## Launch Mode by Platform

Server 到处都一样；只改变 launch mode。

- **Claude Code / Claude desktop app：** 默认使用 detached `start`。如果 app 能打开 localhost URLs，展示返回的 URL 并继续。如果 browser surface 不可用，使用 text path。
- **Codex CLI / Codex app：** 如果 detached processes 会被 reap，或 URL 在 tool call 后失效，通过平台的 long-running/background terminal mechanism 使用 `start --foreground`。如果没有稳定 browser surface，使用 text path。
- **Plain terminal UI：** 打印返回的 URL，让用户手动打开。如果打开 browser 会打断流程，就在 chat 中继续 decision。
- **Remote or containerized sessions：** 如果 `localhost` 无法从用户 browser 访问，用 `--host 0.0.0.0` 启动，并告诉用户要打开哪个 host/port。如果无法讲清楚，使用 text path。

不要因为存在 local server 就强行走 visual path。用户选择 visual 是为了更快理解 decision；如果平台 plumbing 反而挡路，就切回 text。

## Post-Artifact Feedback

After showing the visual artifact, 可用时使用平台的 blocking question tool 收集 bounded artifact feedback。这仍然是 chat-based feedback，不是 browser event capture。

当预期回答是小型 choice set 时，使用 bounded interactive question：

- A/B/C/D option selection
- visual direction vs mix
- choose one layout/state/behavior
- accept one option with requested tweaks

Tool 支持时包含 free-text fallback option。只有当 feedback 确实是 open critique、不存在 interactive question tool，或 tool 报错时，才使用 plain chat。

推荐 post-artifact prompt：

> Which direction best matches what you want? Pick A, B, C, D, or mix, and use the free-text fallback for anything that feels off. Judge the behavior shape, not the exact styling.

不要要求用户在 browser artifact 内点击。Question tool 用于 artifact 可见后的 chat/session response。

## Interaction Contract

Browser/artifact 是 display-only。Feedback 发生在 chat 中。

不要在 v1 中添加 click tracking、selected states、event ingestion、forms、analytics 或 "submit" affordances。不要要求用户点击某个 option。让用户查看 artifact，然后在 chat 中回复 choice、mix 或 correction。

No click tracking；do not ingest browser events。Visual probe v1 只展示 artifact，不读取 browser-side interaction state。

如果没有 interactive question tool，展示 artifact 后使用这个 plain-chat fallback：

> I’m showing three rough options. Reply here with A, B, C, or "mix", plus anything that feels off. Judge the behavior shape, not the exact styling.

用户的 chat response 是 authoritative。Visual artifact 只是 supporting context。

## File Placement

默认使用 OS temp，因为 visual probes 是一次性 scratch：

```text
/tmp/compound-engineering/ce-brainstorm-visual/<run-id>/
  screens/
    001-<decision>.html
  state/
    display-info.json
```

只有当用户明确想在 session 后 inspect、preserve 或 curate sketches 时，才使用 `.context/compound-engineering/ce-brainstorm-visual/<run-id>/`。`docs/brainstorms/` 下的 final requirements doc 才是 durable artifact。
