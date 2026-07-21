# `ce-promote`

> 把已发布 feature 转成可直接复制粘贴、面向用户的 announcement copy，并且就在 engineering workflow 内完成。默认不依赖 Spiral；安装 Spiral CLI 后可生成 voice-matched 文案。

`ce-promote` 是 **post-ship messaging** skill。Feature merge 后，它会判断实际 ship 了什么、选择合适 channels，并起草 announcement copy：X post 或 thread、一行 changelog blurb、LinkedIn post、email、blog intro、short demo script。即使什么都没安装，也能产出好 copy；当 [Spiral CLI](https://www.npmjs.com/package/@every-env/spiral-cli) 已安装且已认证时，会用它生成匹配 brand voice 的 drafts。

Declining the one-time Spiral setup offer is remembered in the checkout-local config; see the [configuration reference](./configuration.md).

It drafts only. It never posts, publishes, commits, or opens PRs — shipping the copy is a human action.

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 总结 ship 内容、选择 channels、起草 announcement copy，并呈现给你 review |
| 何时使用 | Feature 刚 ship，希望在 workflow 内起草 user-facing messaging 时 |
| 产出什么 | 按 channel 标注、可复制粘贴的 drafts；绝不是 auto-post |
| Spiral | 可选增强：CLI ready 时生成 voice-matched drafts；否则只提示一次 setup，然后用轻量 editorial & social expertise 起草 |

---

## 调用示例

```text
# 从当前 project 推导已发布内容，并为默认 channels 起草文案
/ce-promote

# Repository context 不足时，直接提供已交付价值
/ce-promote announce one-click CSV export for account reports

# 要求同一 channel 的多个备选方案
/ce-promote 3 tweet options for the new one-click CSV export

# 起草协调一致的 cross-channel launch set
/ce-promote a launch across X, LinkedIn, and email for one-click CSV export
```

需要特定 distribution shape 时请明确 channels；否则 skill 会选择一小组默认 channels。它只起草，绝不发布。

---

## 问题

Messaging 通常要等单独的 marketing pass，因此落后于 ship；而最了解 user value 的 engineer 往往不是写 copy 的人。当 announcement copy 临时写出来时，又容易带着 AI tells（"We're thrilled to announce..."）、hashtag spam，以及 implementation-speak，而不是用户价值。

## 方案

`ce-promote` 会在 ship 当下基于 ship context 起草 copy：

- **推导 ship 了什么**：可以来自 free-form description，也可以来自 merged PR、diff、changelog 和 recent commits；总结的是 *user-facing value*，不是代码。
- **合理选择 channels**：默认生成 X post + changelog blurb，并按用户要求和 change 价值扩展。
- **Spiral ready 时生成 voice-matched copy**；否则只提示一次 setup（sign in 或 install）。用户拒绝后，会用轻量 editorial & social-media fundamentals 自行起草强 channel-specific copy。
- **呈现 drafts 供 review**：可复制粘贴、按 channel 标注、永不发布。

---

## 它的新意

### 1. Spiral 是微妙的可选增强，绝不是依赖

Skill 会把 Spiral 检测为三种状态（`which spiral` + `spiral auth status --json`）：ready、installed-but-unauthed、absent。Ready 时，drafts 会匹配用户 brand voice，并持久化到用户 Spiral account（每个 draft 都带 web-app `url` 方便调整）。Not ready 时，skill 只提示 setup **一次**：如果已安装但未认证，agent 运行 `spiral login` 并分享 sign-in link（用户在 browser 中 approve，API key 不会进入 agent）；如果缺失，则指向一步 install command。拒绝始终可以：它会 fallback 到轻量 editorial & social-media expertise，自行起草好 copy，并记录 opt-out，以后不再打扰。无论有没有 Spiral，这个 skill 都有用。

### 2. Multi-channel / cue-word 陷阱被编码进去了

Spiral 的 multi-channel 行为由措辞驱动，不由 flag 驱动，而且有一个 skill 显式处理的 sharp edge：

- **同一 channel 的 N 个 variations** -> 请求 "3 tweet options"，*避免* cue words（`campaign`、`across`、`multi-channel`、`everywhere`、`cross-post`），并传 `--num-drafts 3`。一个不小心的 cue word 会触发 campaign mode，把输出折叠成单个 draft，并静默忽略 `--num-drafts`。
- **真正的 cross-channel set** -> 在 prompt 中写明 channels；Spiral 会返回每个 channel 的 drafts set，数量由它决定，通常是多个；`--num-drafts` 会被忽略。一次调用产出完整 cross-channel set。

### 3. 只起草，发布始终由人完成

Skill 永远不会 post、schedule、publish、commit 或 open PR。Output 始终是 review-ready drafts。这样可把人保留在 outward-facing 且难以回滚的动作上。

### 4. 用户价值优先于实现细节

"what shipped" summary 描述用户现在能做什么、为什么会在意，而不是让它成为可能的 serializer 或 endpoint。Direct drafting 会禁止 AI tells、throat-clearing 和 hashtag spam，并把长度和 tone 匹配到每个 channel。

---

## 快速示例

你 merge 了一个添加 one-click CSV export 的 PR。

**Single-channel variations:** `/ce-promote 3 tweet options for the new one-click CSV export` -> skill 总结价值，然后（Spiral path）运行 `spiral write "3 tweet options for one-click CSV export" --instant --num-drafts 3 --json`，不带 cue words；或（no-Spiral path）直接写出三个不同 tweets。三个结果都会以可复制粘贴 block 呈现。

**Cross-channel set:** `/ce-promote draft a launch across X, LinkedIn, and email` -> （Spiral path）`spiral write "announcing one-click CSV export — a launch across X, LinkedIn, and email" --instant --json` 返回每个 channel 的 draft set（Spiral 决定数量）；（no-Spiral path）skill 直接起草一条 X post、一条 LinkedIn post 和一封 email。每个返回 draft 都按 channel 标注，并可直接复制。

---

## 何时使用

在以下情况使用 `ce-promote`：

- Feature 刚刚 ship，希望在 context 消退前起草 announcement
- 需要从一个 prompt 生成 cross-channel copy（tweet + LinkedIn + email）
- 想要 voice-matched copy，且已经安装 Spiral

以下情况跳过：

- 没有 user-facing 内容 ship（internal refactor、CI-only、test-only）
- 只需要 internal release notes；这类内容不面向 end users，通常不走 promotion copy

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 从 PR/diff/changelog/commits 推导 ship 内容，并起草默认 channel set |
| `<description>` | 对 ship 内容的 free-form description，作为 source of truth |
| `<channels>` | 例如 "a tweet thread and a LinkedIn post"、"3 tweet options"、"a launch across X, LinkedIn, and email" |

详细 Spiral CLI mechanics 位于该 skill 的 `references/spiral-cli.md`。

---

## See Also（另见）
