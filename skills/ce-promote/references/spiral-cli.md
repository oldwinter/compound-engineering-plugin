# Spiral CLI reference（Spiral CLI 参考）

Spiral（`@every-env/spiral-cli`）会用用户的 brand voice 起草文案。`ce-promote` 将其作为**可选增强**使用；每次调用都必须被包裹起来，确保 CLI 缺失、未认证或报错时绝不阻塞 skill。

## Detection — three states（检测：三种状态）

```bash
which spiral
spiral auth status --json 2>/dev/null
```

- **Absent** — `which spiral` 找不到任何结果。→ Path 0（提供 install + connect）。
- 否则解析 `spiral auth status --json`：
  - **Ready** — `"authenticated": true`（等价于 `"status": "authenticated"`，任意 `source`）。使用 Path A。
  - **Unauthed** — `"authenticated": false`。→ Path 0（提供 sign in）。
  - **Older CLI** 忽略 `--json`（输出不是 JSON）：回退到同一输出中的 human-readable signal；当且仅当包含 `spiral_sk_` 时为 ready，否则为 unauthed。

优先使用 JSON `authenticated` flag，而不是 substring-matching `spiral_sk_`；该 flag 是设计好的 contract，substring 只是 backward-compat fallback。任何 error 或 timeout → 视为 not-ready 并继续；绝不阻塞。

## Path 0 — Offer setup（提供 setup，首次运行，可拒绝）

当 Spiral 未认证或缺失时，提供一次 setup。先检查 opt-out，避免反复打扰。

### Check the opt-out（检查 opt-out）

读取 project config（解析 repo root，绝不要用 CWD）：

```bash
cat "$(git rev-parse --show-toplevel 2>/dev/null)/.compound-engineering/config.local.yaml" 2>/dev/null || echo '__NO_CONFIG__'
```

如果内容里有一行**未注释**的顶层 `ce_promote_spiral_optout: true`，则**跳过 Path 0** 并直接进入 Path B。**忽略注释行**；`ce-setup` 的模板会带一个 `# ce_promote_spiral_optout: true` 示例，注释行是文档，不是 opt-out（naive substring match 会错误地为任何接受默认模板的项目抑制 offer）。否则，提供 setup。

### Ask（询问）

使用平台 blocking-question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 和 `select:AskUserQuestion` 调用）、Codex 中的 `request_user_input`、Antigravity / Pi 中的 `ask_user`。如果没有 blocking tool 或调用报错，在聊天中以编号列表呈现相同选项并等待回复；绝不要静默跳过。

对于 **unauthed** 状态，**agent 自己**运行 `spiral login --json`（CLI >= 1.8.0）：它是 non-blocking，且 API key 永远不会经过 agent；agent 分享返回的 `auth_url`，用户在浏览器中 approve，credential 由 server->CLI 交付。blocking question 主要是 escape hatch。

使用 question stem 说明机制、提供 escape hatch，并披露拒绝是持久的（避免把永久副作用藏在听起来临时的标签后面）： "Spiral personalizes and humanizes the copy in your voice. [It's installed but not signed in / It isn't installed yet] — sign in now, or have the agent draft directly without Spiral? (Declining drafts your copy now and won't bring up Spiral again in this project; you can set it up anytime by asking.)"

仅提供**两个**选项（labels 必须 self-contained）：

- **Unauthed** state（未认证状态）: `Sign in to Spiral` · `Draft directly without Spiral`
- **Absent** state（未安装状态）: `Install Spiral` · `Draft directly without Spiral`

这里刻意没有单独的 "don't ask again" 选项：**dismiss 本身就是 opt-out。** 首次运行时一次 decline 会记录 flag，并且该 offer 不会在此 repo 中再次出现。这能避免 per-ship skill 反复打扰；绝不要让用户为了不再被询问而必须选择特殊变体。

### Act on the choice（根据选择行动）

- **Sign in to Spiral**（installed, unauthed）— agent 自己运行 `spiral login --json`。它是 non-blocking，且 **API key 永远不会接触 agent**（token 通过 device-code flow 由 server->CLI 交换）。解析 JSON `status`：
  - `already_authenticated` — `{ "authenticated": true, "status": "already_authenticated", "prefix": "..." }`：credential 已存在；无需 approve。进入 Path A。（要切换账号，用户需先运行 `spiral logout`。）
  - `pending` — `{ "status": "pending", "auth_url": "...", "user_code": "ABCD-2345", "expires_in": 900 }`：向用户展示 `auth_url`，让他们在浏览器中打开并 approve（`user_code` 已嵌入 URL；也展示它，方便用户确认匹配），然后等待。用户说已经 approve 后，通过运行 `spiral auth status --json` 确认：claimed 时返回 `"authenticated": true`，否则若尚未完成则返回 `"status": "pending"`（重新检查，不要用 sleep 忙等；让用户确认驱动 re-check）。如果一直未 claimed 或 code 过期（约 `expires_in` 秒），提供 retry 或 fall to Path B。成功后 -> Path A。
  - **绝不要让用户把 API key 粘贴到聊天中**；使用 agent login 时，agent 完全不会处理 key。
  - **Older CLI (< 1.8.0, no agent login):** 如果 `spiral login --json` 返回旧版 `API key required ... --token` 文本而不是 JSON，建议 `npm i -g @every-env/spiral-cli@latest`，或让用户在自己的终端运行 `spiral login`（browser sign-in），再重新检查 `spiral auth status`。如果用户不愿意，进入 Path B。
- **Install Spiral**（absent）— pairing-code command 会一步完成安装和连接。引导用户到 https://app.writewithspiral.com 的 Settings → Connect an Agent 复制他们的命令，形如：
  ```bash
  npx @every-env/spiral-cli@latest setup --pairing-code <code>
  ```
  pairing code 是 single-use，且约 15 分钟后过期，所以用户必须从 web app 获取新的 code；不要 hardcode。安装后，如果仍 unauthed，遵循上方 **Sign in to Spiral** flow（`spiral login --json`）。如果用户不能或不愿安装，进入 Path B。
- **Draft directly without Spiral** — 记录 opt-out（见下文），让该 offer 不会在此 repo 中再次提示，然后进入 Path B。（失败或放弃的 **sign-in or install** 尝试不会记录 opt-out；只有明确选择 "draft directly" dismissal 才会记录。因此认证未完成的用户在下一次运行时仍会得到一次干净的 re-offer。）

### Record the opt-out（记录 opt-out，best-effort）

解析 repo root，然后使用 native file-write/edit tool，将 `ce_promote_spiral_optout: true` 作为顶层 key 添加到 `<root>/.compound-engineering/config.local.yaml`：

- **File already exists:** 确保存在一行**未注释**的 `ce_promote_spiral_optout: true`；除非未注释行已存在，否则添加一行（或取消注释示例）。来自 `ce-setup` 模板的注释 `# ce_promote_spiral_optout: true` **不**算存在；如果只留下注释，忽略注释的 read path 下一次会再次提示。
- **File absent:** 创建该文件（及其 `.compound-engineering/` directory）并写入 key，**同时**确保 machine-local config 不会被提交。检查 root-relative path `<root>/.compound-engineering/config.local.yaml` 是否已被忽略（`git check-ignore -q <path>`）；如果没有，向 git 的 **local exclude file** 追加 `.compound-engineering/*.local.yaml`。用 `git rev-parse --git-path info/exclude` 解析该文件路径（在 worktrees 中这也正确，因为 `.git` 是一个*文件*，而 `info/exclude` 位于 common git dir；**不要** hardcode `<root>/.git/info/exclude`）。使用 local exclude，**不要**用 `.gitignore`：它让规则保持 local，并避免在 drafts-only action 中弄脏 tracked file。`ce-setup` 是为 teammates 添加 shared `.gitignore` entry 的 canonical place。没有任何 ignore 时，在 `/ce-promote` 早于 `/ce-setup` 运行的用户可能意外提交 machine-local opt-out state。

如果无法解析 root 或任何写入失败，仍继续 Path B；opt-out 是便利项，绝不是 blocker。

记录后，用一行话确认，避免写入静默发生，并让用户知道如何撤销；例如："Got it — I won't bring up Spiral here again (saved to `.compound-engineering/config.local.yaml`, kept out of git). Want it back later? Just ask, or remove the `ce_promote_spiral_optout` key." 保持一行即可；不要展开。

## Generate（生成）

```bash
spiral write "<prompt>" --instant --num-drafts <1-5> --json
```

- `--instant` — 跳过 clarifying questions。**始终使用它**；这是 headless context，中途没有人类。
- `--json` — machine-readable output。始终使用它。
- `--num-drafts <1-5>` — drafts 数量（仅 single-channel mode；见 gotcha）。
- `--workspace <uuid>` — 限定到某个 brand-voice workspace。用 `spiral workspaces` 列出。仅当用户命名某个 workspace 时使用。
- `--style <uuid>` — 固定某个 voice/style。仅当用户命名某个 style 时使用。

### Output shape（输出形状）

JSON（字段已按 Spiral CLI `write` 输出验证）：

```json
{
  "session_id": "uuid",
  "status": "complete | needs_input",
  "drafts": [
    { "id": "uuid", "title": "...", "content": "markdown", "channel": "x",
      "url": "https://app.writewithspiral.com/chat/<session>?draft=<id>", "display_hint": "inline | expandable" }
  ],
  "text": "pipeline commentary — DO NOT show the user unless drafts is empty",
  "style_used": null,
  "quota_remaining": 42
}
```

- `channel`（小写）是 `x`、`linkedin`、`email`、`newsletter`、`blog`、`instagram_tiktok`、`research` 或 `null` 之一。
- `url` 会在 Spiral web app 中打开该 draft 进行编辑。Drafts 会持久化到用户账号；在输出中展示 `session_id` 和每个 `url`（Phase 4）。
- **不要向用户展示 `text` 字段**；它是 internal pipeline commentary。仅当 `drafts` 为空时才回退使用它。
- 使用 `--instant` 时，`status` 应为 `complete`。如果返回 `needs_input`（在 `--instant` 下少见），不要把 Spiral 的问题转述给用户；要么通过 `--session` follow-up 用已有 context 回答，要么对该 channel 回退到 Path B。

如果 parsing 失败或 `drafts` 为空，对受影响 channels 回退到 direct drafting。

## The multi-channel / cue-word gotcha（多 channel / cue word 陷阱，重要）

Multi-channel output 是**由措辞驱动的，不是由 flag 驱动的。** 当 prompt 包含 **≥2 个 channel keywords**（tweet/X、LinkedIn、email、blog 等）**或**任意 cue word：`campaign`、`across`、`multi-channel`、`everywhere`、`cross-post` 时，Spiral 会进入 "campaign mode"。

需要编码两个后果：

### (a) To get N variations of ONE channel（获取单一 channel 的 N 个变体）

请求 `"3 tweet options for <feature>"`，并且：

- **避免**上面的 cue words。讽刺的是，字面包含 `campaign` 或 `multi-channel` 的 prompt 会触发 campaign mode；所以描述任务时**不要**使用这些词。
- 传入 `--num-drafts 3`。

如果意外包含 cue word，Spiral 会判定它是 single campaign piece，并返回 **1 个 draft**，忽略 `--num-drafts`。

✅ `spiral write "3 tweet options for one-click CSV export" --instant --num-drafts 3 --json`
❌ `spiral write "a tweet campaign for CSV export" --instant --num-drafts 3 --json`  (collapses to 1 draft，折叠为 1 个 draft)

### (b) To get a real multi-channel set（获取真正的 multi-channel 组合）

在 prompt 中命名多个 channels。Spiral 会为**每个 channel 返回一组 drafts**，每个 draft 都带有自己的 `channel`。在此模式下，**`--num-drafts` 会被忽略**；使用 per-channel counts。

✅ `spiral write "announcing one-click CSV export — a tweet and a LinkedIn post" --instant --json`
✅ `spiral write "a campaign across email, LinkedIn, and Twitter for CSV export" --instant --json`

当用户想跨 surfaces 宣布时，这种 one-call cross-channel set 最适合 `ce-promote`。

**Spiral 自行选择 per-channel counts。** 在 campaign mode 中，每个 channel 的数量由 Spiral 决定，不由你决定。例如 "a tweet and a LinkedIn post"（live verified）返回 3 个 X drafts + 2 个 LinkedIn drafts（共 5 个），每个都标有自己的 `channel`。Phase 4 中按 `channel` 分组返回的 `drafts`；不要假设每个 channel 一个。

## Failure handling（失败处理）

Detection 返回 not-ready 时，通过上方 Path 0 route。一旦进入 Path A，以下任何情况都应对受影响 channels 静默回退到 direct drafting（SKILL.md Path B）：

- `spiral write` exits non-zero, hangs, or emits non-JSON
- `drafts` is empty or missing expected fields

绝不要将 raw Spiral errors 作为 blocker 展示给用户。该 skill 始终产出 drafts。
