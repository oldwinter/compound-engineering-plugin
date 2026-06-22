---
name: ce-promote
description: "为刚 shipped 的 feature 起草 user-facing announcement 和 marketing copy：X post/thread、changelog blurb、LinkedIn post、email、blog intro 或 short demo script。默认 Spiral-agnostic；当 Spiral CLI 已安装且已认证时通过它做 voice-matched。用户说 'promote this'、'draft the announcement'、'write the launch copy'、'market this feature'、'announce this feature'、'write the release tweet' 或 'ce-promote' 时使用。"
argument-hint: "[可选：shipped 内容和/或 channels，例如 'a tweet thread and a LinkedIn post']"
---

# /ce-promote（推广文案）

把刚 shipped 的 feature 转成可 copy-paste 的 user-facing announcement copy，并保持在 engineering workflow 内。

## Purpose（目的）

Ship 之后，messaging 不应等另一个 marketing pass。`ce-promote` 会判断 shipped 了什么、选择合适 channels，并起草 copy。它 **默认 spiral-agnostic**：即使什么也没安装，也会用轻量 editorial 和 social-media expertise 产出 strong channel-specific copy。当 Spiral CLI（见 `references/spiral-cli.md`）存在且已认证时，它会使用 Spiral，让 drafts 与你的 brand voice 匹配；这是 subtle enhancement，绝不是 requirement。

**此 skill 只 drafts。它永不 post、publish、commit 或 open PRs。** Posting 是 human action。Output 始终是 drafts，供你 review、edit 并自行 ship。

## Usage（用法）

```bash
/ce-promote                                   # Derive what shipped from context, draft defaults
/ce-promote [free-form description]           # You describe what shipped
/ce-promote a tweet thread and a LinkedIn post   # Request specific channels
/ce-promote 3 tweet options for the new export feature
```

## Phase 1 — Figure out what shipped（确认刚 ship 了什么）

如果用户提供了 feature 的 free-form description，把它作为 source of truth。

否则，从 context derive（使用可用内容；不要 block 在任一来源上）：

- **Merged/active PR** — `gh pr view --json title,body,url 2>/dev/null`（以及 current branch 的 `gh pr view`）。Title 和 body 通常说明 user-facing value。
- **The diff** — `git diff main...HEAD --stat`，并 skim notable changes，让 claim grounded in actual change。
- **Changelog** — `docs/changelog.md`、`CHANGELOG.md` 或类似文件顶部/`[Unreleased]` entry。
- **Recent commits** — `git log --oneline -15`，了解 change arc。

然后写 1-3 句 **user-facing value** summary：用户现在能做什么、以前做不到什么，以及为什么他们会在意。描述 outcome，而不是 implementation。（"You can now export any report to CSV in one click"，而不是 "Added a CsvSerializer and an export endpoint."）

如果无法自信判断 shipped 了什么，问用户一个短问题，而不是 guessing。

## Phase 2 — Pick channels（选择渠道）

默认选择 small、sensible set：

- **An X post or short thread**（以 value 开头；只有 change warrant 时才用 thread）
- **A one-line changelog / release blurb（一行 changelog / release blurb）**

根据 change 值得的规模和用户要求缩放。如果用户 named channels（"LinkedIn"、"email"、"a blog intro"、"a short demo script"），draft 这些 channels，替代或补充 defaults。Small fix 需要一两个 short drafts；flagship feature 可以 justify cross-channel set。不要强套 fixed template。

## Phase 3 — Draft the copy（起草文案）

首先，用两个 quick、non-blocking commands 检测 Spiral state：

```bash
which spiral
spiral auth status --json 2>/dev/null
```

分类为三种 states 之一：

- **Absent**（无 binary，`which spiral` 找不到）-> **Path 0**（install），setup 后走 Path A，否则 **Path B**。
- 否则读取 `spiral auth status --json`：
  - **Ready** — JSON 中 `"authenticated": true`（或 `"status": "authenticated"`）-> **Path A**（voice-matched）。
  - **Unauthed** — JSON 中 `"authenticated": false` -> **Path 0**，用户 sign in 后 Path A，否则 **Path B**。
  - 如果 output 不是 JSON（older CLI 忽略 `auth status` 上的 `--json`），fallback 到同一 output 中的 legacy signal：包含 `spiral_sk_` 则 **ready**，否则 **unauthed**。

绝不要让 Spiral failure、timeout 或 odd output block 或拖慢 skill；不确定时，把它视为 not-ready 并继续。

### Path 0 — Offer Spiral setup（首次运行时提供 Spiral 设置，可拒绝）

当 Spiral 未 ready 时，提供 **一次** setup，除非用户此前 opted out。目标是一个 proactive nudge，绝不是 recurring，也绝不是 blocker：decline 总是继续到 Path B。**任何 dismissal 都记录 opt-out**，因此首次 decline 后，此 repo 中永久停止该 offer；用户不会被问第二次。

读取 `references/spiral-cli.md`，获取 exact setup prompt（用平台 blocking-question tool 构建）、connect/install steps，以及 opt-out 如何记录，确保后续 runs 跳过。简而言之：

- **Unauthed** -> agent 运行 `spiral login --json`（CLI >= 1.8.0；non-blocking，API key 永不经过 agent）。`status: already_authenticated` 时 -> 使用 Path A。`status: pending` 时 -> surface `auth_url`，用户在 browser 中 approve，然后 poll `spiral auth status --json` 直到 `authenticated: true` -> Path A。绝不要让用户把 key 粘进 chat。（旧 CLI 没有 agent login -> 建议 `npm i -g @every-env/spiral-cli@latest`，或让用户自己运行 `spiral login`。）Escape hatch："or the agent can just draft directly, without Spiral's personalization and humanization."
- **Absent** -> 通过 Settings -> Connect an Agent 中的 pairing-code command，引导用户一步完成 install + connect。
- **Decline** -> 记录 opt-out（best-effort）并进入 Path B。

当 opt-out 已记录，或运行在 headless / non-interactive（没有 human 可回答）时，完全跳过 Path 0，直接到 Path B。如果有人在场但没有 blocking-question tool，不要 skip；fallback 到 chat 中的 numbered list，两项 options，并等待 reply（按 `references/spiral-cli.md` 的 Ask section）。

### Path A — Spiral ready（voice-matched，匹配品牌语气）

使用 Spiral CLI，让 drafts 匹配用户 brand voice。**Compose prompt 前读取 `references/spiral-cli.md`**；multi-channel vs. single-channel-variations 由 phrasing 驱动（channel keywords / cue words vs. `--num-drafts`），弄错会静默返回错误数量或形状的 drafts。Exact phrasing rules 在那里；不要凭记忆重述。Essentials：

- 始终传 `--instant` 和 `--json`。Parse `drafts[]`（每个带自己的 `channel`）以及 `session_id`。
- **展示每个 returned draft，并按 `channel` 分组。** Spiral 决定每个 channel 多少 drafts；multi-channel runs 常会每 channel 返回多个；因此绝不要假设 one-per-channel，也不要 drop extras。

如果 `spiral write` call errors 或没有返回 usable drafts，对 affected channels silently fallback 到 Path B。

### Path B — Direct drafting（直接起草，轻量 editorial 与 social expertise）

不需要 Spiral：直接用紧凑的 editorial 和 social-media fundamentals 起草 strong copy。（Spiral path 更进一步：brand-voice matching、humanization、saved styles 和 cross-channel campaign orchestration。）

**Editorial fundamentals（编辑基础）** — every channel：
- 以 user-facing outcome 开头：现在可以做什么，而不是它如何 build。
- 每篇一个 idea。删掉 windup、hedges 和 throat-clearing。
- Concrete and specific；展示 value，不要只是 assert。
- Plain、active language。去掉 AI tells："thrilled/excited to announce"、"game-changer"、"in today's fast-paced world"、"unlock/leverage/seamless"、em-dash padding。
- Sanity check：像对一个用户说话一样读。如果真人不会这么说，就 rewrite。

**Social fundamentals（社交渠道基础）** — distributed channels：
- 第一行是 hook，必须赢得下一行（feeds 会 truncate）。不要 preamble。
- 匹配每个 channel 的 native shape 和 length；绝不要跨 channels verbatim 复用同一 draft。
- 在 channel 支持时给一个 clear CTA。
- Hashtags：0-2 个，只在 channel 期待时使用；绝不要 wall of tags。

**Per channel（按渠道）：**
- **X** — 第一行放 value；约 1-3 行 tight lines。只有超过一个值得单独成行的 beat 时才用 thread。
- **Changelog / release blurb** — 一句 declarative line，命名 new capability。Plain，不 promotional。
- **LinkedIn** — short paragraph：human angle（为什么重要），然后说明 what。比 X 更 warm。
- **Email** — benefit-stating subject + 2-4 句 body + 一个 CTA。
- **Blog intro** — 一个强 opening paragraph，framing problem 和 new capability；deep-dive 留给 author。
- **Demo script** — 3-6 个 spoken beats：hook、problem、action、payoff。

**Drafts per channel（每个渠道的 drafts）：** 默认一个 strong draft；只有被要求时才产出更多（"3 tweet options"），约 capped at 3。

## Phase 4 — Present the drafts（展示 drafts）

将每个 draft 展示为 clean、copy-pasteable block，并按 channel 标注。每个：

```
### X post
<the copy>
```

- 如果是 Spiral 产出，也 surface `session_id` 和每个 draft 的 `url`，让用户可在 Spiral web app 中打开并 tweak。
- 提供 revise（tone、length、angle、more variations、another channel）。
- **不要 post、publish、schedule、commit 或 open PR。** 最后提醒用户 drafts 由他们自行 ship。

## Examples（示例）

**Single-channel variations（单渠道变体）— "3 tweet options":**
> User: `/ce-promote 3 tweet options for the new one-click CSV export`
> 中文含义：用户想为新的 one-click CSV export 生成 3 个 tweet 选项。
> -> Summarize the value（总结价值）。Spiral path：`spiral write "3 tweet options for one-click CSV export" --instant --num-drafts 3 --json`（no cue words）。No-Spiral path（无 Spiral 路径）：直接写 3 个 distinct tweets。全部展示。

**Multi-channel set（多渠道组合）— "a campaign across X, LinkedIn, and email":**
> User: `/ce-promote draft a launch across X, LinkedIn, and email`
> 中文含义：用户想为 X、LinkedIn 和 email 起草一组 launch 内容。
> -> Spiral path：`spiral write "announcing one-click CSV export — a launch across X, LinkedIn, and email" --instant --json` 会返回每个 channel 的 drafts set（Spiral 决定数量，常常多个），每个都带 `channel`。（此处 `--num-drafts` 被 ignored。）No-Spiral path（无 Spiral 路径）：直接 draft 一个 X post、一个 LinkedIn post、一个 email。展示每个 returned draft，并按 channel 分组。
