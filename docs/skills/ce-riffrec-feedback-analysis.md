# `ce-riffrec-feedback-analysis`

> 把原始 [Riffrec](https://github.com/kieranklaassen/riffrec) recordings 转成 structured product feedback：短 capture 生成 quick bug reports，长 capture 做 extensive analysis；当 requirements emerge 时 handoff 给 `ce-brainstorm`。

`ce-riffrec-feedback-analysis` 是 **product-feedback consumption** skill。Riffrec 是一个独立 capture tool，会记录同步的 screen + voice + event sessions，并输出 `riffrec-*.zip` bundle。这个 skill 是 consumption side：它分析这些 bundles（或任何 video / audio / meeting-notes file），按 length 和 intent 在三条 paths 间 route，并根据 recording 中的实际内容产出合适 artifact。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 分析 Riffrec zip（或 video/audio/notes file），route 到 setup / quick-bug / extensive-analysis path，并产出 structured feedback artifacts |
| 何时使用？ | `riffrec-*.zip` 出现在 chat；video、audio 或 meeting-notes file 作为 feedback 被分享；用户询问如何 capture 和 share Riffrec sessions |
| 产出什么？ | Quick：一个 concise bug report。Extensive：requirements-shaped analysis + handoff 到 `/ce-brainstorm` |
| 三条 path | Setup（尚无 recording）、Quick bug report（约 60 秒以内、单一 issue）、Extensive analysis（更长、多个 issues） |

---

## 调用示例

```text
# 分析完整的 Riffrec capture bundle
/ce-riffrec-feedback-analysis riffrec-2026-05-04-checkout-flow.zip

# 通过同一 router 分析视频、音频或文字 feedback
/ce-riffrec-feedback-analysis demo.mp4
/ce-riffrec-feedback-analysis voice-memo.m4a
/ce-riffrec-feedback-analysis meeting-notes.md

# 尚无录制内容时获取 capture setup 帮助
/ce-riffrec-feedback-analysis how do I install and use Riffrec?
```

短小的单一问题输入会变成简洁 bug report；更长或包含多个问题的输入会产出 structured analysis，并 hand off 给 `ce-brainstorm`。

---

## 问题

Raw user-feedback recordings 不会自动变成 structured input：

- **Long recordings 被忽略**：12 分钟 walkthrough 太密，不 preprocessing 很难行动
- **Multi-issue recordings 收缩成一个 fix**：recording 覆盖 4 个 distinct problems，但只有第一个得到 attention
- **Audio nuance lost in transcription**：用户说了什么不如他们试图做什么重要；raw transcripts 会漏掉 intent
- **Privacy bleed**：磁盘上的 raw screen captures 和 audio 可能被意外 commit
- **No bridge to building**：feedback 存在，但没有东西把它转成 brainstorm 或 plan
- **Setup friction**：用户想分享 feedback，但不知道如何安装 capture tool

## 解决方案

`ce-riffrec-feedback-analysis` 运行带 routing 的 flow，共三条 paths：

- **Setup path**：当用户还没有 recording，并询问如何 install / capture / share 时，展示 Riffrec install guide 和 capture instructions
- **Quick bug report**：短 recording、单一 issue、"just transcribe" intent -> 一个 concise bug report，不生成 full artifact set
- **Extensive analysis**：较长 recording 或多个 issues -> 带 screenshots 的 structured analysis、requirements-shaped output，并 mandatory handoff 到 `/ce-brainstorm`

Skill 默认让 raw recordings、audio chunks、zip contents 和 extracted screenshots 保持 local-only，不会 automatic commit。Text artifacts（analysis summaries、problem analyses）在 traceability 重要且无 sensitive data 时可以 commit。

---

## 新颖之处

### 1. 基于 length + intent 的 three-path routing

Path 由 input 实际需要决定，而不是 flag：

- **Setup**：用户还没有 recording，询问如何 install Riffrec、capture session 或 share feedback。Skill 加载 `references/install-riffrec.md` 并 walkthrough。
- **Quick bug report**：约 60 秒以内、单一 issue，或用户明确要求 "quick"、"small"、"just transcribe"。Output 是一个 concise bug report；skill 跳过 full artifact set 和 brainstorm handoff。
- **Extensive analysis**：更长、多个 issues / requirements / workflow walkthroughs，或用户想要 requirements material。Output 是完整 structured analysis 和 screenshots；skill **始终继续进入 `/ce-brainstorm`**。

当 input ambiguous（zip 到了但没有 context）时，skill 会先 inspect recording length 和 event count 再选择。如果仍不清楚，就询问用户。

### 2. Raw artifacts 的 privacy-default

Raw recordings、audio chunks、zip contents、session dumps 和 extracted screenshot frames 默认保持 local-only。除非用户明确要求并确认 privacy 可接受，否则 `raw/` 和 `frames/` directories 不会 commit。Text/metadata artifacts（analysis summaries、problem analyses、source manifests）在需要 traceability 且不含 sensitive data 时可以 commit。

Committed docs 中使用 repo-relative screenshot paths，确保后续 agents 可以打开 evidence，而不依赖 absolute local paths。

### 3. Single analyzer entry point：接受多种 input shapes

所有 non-setup paths 共用一个入口：`python scripts/analyze_riffrec_zip.py /path/to/input`。可接受 inputs：

- Riffrec `.zip` bundle（Riffrec `.zip` 包）
- `.mp4` / `.mov` / `.webm` video
- `.m4a` / `.mp3` / `.wav` audio file
- Meeting-notes `.md`（会议记录 `.md`）

这让 skill 超越 Riffrec 也有用；任何 recorded feedback 都能进入同一 pipeline。

### 4. Context-aware output location（感知上下文的输出位置）

在有 `docs/brainstorms/` 的 repos 中，默认 output directory 是 `docs/brainstorms/riffrec-feedback/`，让 analysis 落到 downstream skills（`ce-brainstorm`、`ce-plan`）期望寻找 requirements material 的位置。Quick path 会 override 到 temp location，避免用 single-issue bug reports 污染 repo。

### 5. Extensive analysis 使用 Compound Engineering output format

Extensive path 产出 `references/compound-engineering-feedback-format.md` 中记录的 Compound Engineering feedback format，结构设计为能干净喂给 `/ce-brainstorm` 作为 raw input。Multiple issues / requirements / observations 会分开，每项带 relevant screenshot frames 和 timestamps。Brainstorm 接收的是 starting point，不是 transcript。

### 6. Extensive analysis mandatory handoff 到 `ce-brainstorm`

Extensive path 在 analysis 落盘后始终继续进入 `/ce-brainstorm`。Recording 捕获的是 *用户体验到了什么*；brainstorm 澄清的是 *应该据此 build 什么*。没有 handoff，analysis 只会躺在磁盘上，没人知道该怎么处理。

Quick path 会跳过 handoff；single bug report 本身就是 deliverable。

### 7. Lazy reference loading（懒加载 reference）

Skill 只加载所选 path 的 reference：setup 用 `install-riffrec.md`，quick 用 `quick-bug-report.md`，extensive 用 `extensive-analysis.md`。其他 references 不读取，让 runtime context 保持小。

---

## 快速示例

同事在 chat 中分享 `riffrec-2026-05-04-checkout-flow.zip`。你把它拖进来。

Skill 检测到 Riffrec zip，运行 analyzer inspect length 和 event count：8 分钟、47 个 events、触及多个 distinct UI surfaces。它 route 到 **extensive analysis**。

Analyzer 提取：同步 voice transcript、event boundaries 处的 screen capture frames、带 timestamps 的 event log。它识别 4 个 distinct issues：(1) "Buy now" CTA 在 mobile 上隐藏，(2) form validation 没有 inline 显示 error，(3) confirmation email subject line 不清楚，(4) 一个困惑的 "wait, why did it skip step 3?" moment，暗示 flow gap。

它在 `docs/brainstorms/riffrec-feedback/2026-05-04-checkout-flow-analysis.md` 产出 structured analysis，每个 issue 都带 relevant frames 和 timestamps。Raw recording 保持 local-only。

Skill 用该 analysis 作为 starting point 加载 `/ce-brainstorm`。Brainstorm 澄清先处理哪个 issue、success looks like 什么，并产出 requirements doc。

---

## 何时使用

在以下情况使用 `ce-riffrec-feedback-analysis`：

- 收到 `riffrec-*.zip`，想把它转成行动
- 有人把 video、audio 或 meeting notes 作为 product feedback 分享
- 用户询问如何 install Riffrec 或 capture feedback session
- Long walkthrough recording 需要变成 `/ce-brainstorm` 的 structured input

以下情况跳过 `ce-riffrec-feedback-analysis`：

- Feedback 是 text-only 且很短：直接粘贴到 `/ce-brainstorm`
- Recording 是 debug session，不是 feedback：直接处理 bug
- 只想转录 audio，不需要 further structure：使用 transcription tool，而不是此 skill

---

## 作为工作流的一部分使用

此 skill 是进入 chain 的 **front-door entry point**：

```text
recording -> /ce-riffrec-feedback-analysis -> (extensive) -> /ce-brainstorm -> /ce-plan -> /ce-work
                                           -> (quick)     -> bug report (standalone)
                                           -> (setup)     -> instructions for capturing
```

Extensive path 始终继续进入 `/ce-brainstorm`，让 captured feedback 成为 downstream skills 可用的真实 artifact。Quick path 自己产出完整 artifact（bug report），不会强迫 brainstorm overhead。

---

## 单独使用

Skill 最常直接带 Riffrec zip 或其他 input file 调用：

- **Riffrec zip（Riffrec zip 文件）**：`/ce-riffrec-feedback-analysis riffrec-2026-05-04-checkout-flow.zip`
- **Video file（视频文件）**：`/ce-riffrec-feedback-analysis demo.mp4`
- **Audio file（音频文件）**：`/ce-riffrec-feedback-analysis voice-memo.m4a`
- **Meeting notes（会议记录）**：`/ce-riffrec-feedback-analysis meeting-notes.md`
- **Setup question**：`/ce-riffrec-feedback-analysis "how do I install riffrec"`（无 input file；route 到 setup path）

当 input ambiguous（zip 没有 context，或 path-routing signals mixed）时，skill 会先 inspect length 和 event count，再选择；如果仍不清楚，会询问。

---

## 参考

| 参数 | 效果 |
|----------|--------|
| `<file path>` | 分析 file：Riffrec zip、video、audio 或 meeting notes |
| Setup intent ("how do I install", "how to capture") | Route 到带 install instructions 的 setup path |
| Length + intent inferred from input | Route 到 quick 或 extensive path |

Analyzer（分析器）：`scripts/analyze_riffrec_zip.py`。Compound Engineering output format（Compound Engineering 输出格式）：`references/compound-engineering-feedback-format.md`。

---

## 常见问题（FAQ）

**Riffrec 是什么？**
一个独立 capture tool（[github.com/kieranklaassen/riffrec](https://github.com/kieranklaassen/riffrec)），会记录同步 screen + voice + event sessions 并输出 `riffrec-*.zip`。此 skill 是 consumption side；它不 capture，只 analyze captures。

**必须使用 Riffrec 才能用这个 skill 吗？**
不需要。Analyzer 也接受 videos（`.mp4`、`.mov`、`.webm`）、audio（`.m4a`、`.mp3`、`.wav`）和 meeting notes（`.md`）。Riffrec 只是提供带 synchronized event timestamps 的 structured zip，因此 analysis 更丰富。

**为什么 extensive path 总是继续进入 `/ce-brainstorm`？**
因为 recording 捕获的是用户经历，这是 evidence，不是 decision。如果不继续 brainstorm，analysis 会以 transcript-with-screenshots 的形式躺在磁盘上，没人知道应该据此 build 什么。Handoff 让 feedback 变得 actionable。

**为什么 quick path 不同？**
一个 30 秒 recording 展示单个 bug，不需要 full artifact set 或 brainstorm；bug report 本身就是 deliverable。用户已经知道哪里错了；skill 产出 concise report 并停止。

**什么保持 local，什么会 commit？**
Raw recordings、audio、zip contents、frames 默认保持 local：privacy-first。Text artifacts（analysis summaries、bug reports）在 traceability 重要且内容 safe 时可以 commit。Committed docs 中的 repo-relative paths 让后续 agents 能引用 local screenshots，而不需要 absolute paths。

**如果 input ambiguous 怎么办？**
Skill 先 inspect length 和 event count。如果仍不清楚，就询问用户适用哪条 path。问一个问题好过跑错 path。

---

## 另见（See Also）

- [`ce-brainstorm`](./ce-brainstorm.md) - extensive-analysis output 直接进入 brainstorm
- [`ce-plan`](./ce-plan.md) - brainstorm 下游；接收从 recording 产生的 requirements doc
- [`ce-debug`](./ce-debug.md) - quick-path bug report 有 clear root cause 需要调查时使用
- [Riffrec](https://github.com/kieranklaassen/riffrec) - capture-side tool（独立 project）
