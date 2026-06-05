---
name: ce-demo-reel
description: "为 PR descriptions 捕获 visual demo reel（GIF、terminal recording、screenshots）。当 shipping UI changes、CLI features，或任何带 observable behavior 且受益于 visual proof 的工作时使用。用户要求添加 demo、录制 GIF、截屏某个 feature、展示视觉变化、创建 demo reel、capture evidence、向 PR 添加 proof，或创建 before/after comparison 时也使用。"
argument-hint: "[要捕获什么，例如 'the new settings page' 或 'CLI output of the migrate command']"
---

# Demo Reel（演示素材）

检测 project type，推荐 capture tier，录制 visual evidence，上传到 public URL，并返回可放入 PR 的 markdown。

**Evidence 指的是 USING THE PRODUCT，而不是运行 tests。** "I ran npm test" 是 test evidence。Evidence capture 是运行真实 CLI command、打开 web app、发起 API call，或触发 feature。这个区别是绝对的：test output 绝不会被标记为 "Demo" 或 "Screenshots"。

如果真实产品使用不现实（需要 API keys、cloud deploy、paid services、bot tokens），明确说明："Real evidence would require [X]. Recommending [fallback approach] instead." 不要静默跳到 "no evidence needed"，也不要用 test output 替代。

绝不要生成 fake 或 placeholder image/GIF URLs。如果上传失败，报告失败。

## Never Record Secrets（绝不录入 Secrets）

Recordings 绝不能包含 credentials：commands、output、URL bars 或 on-screen UI 中都不行。如果 demo 需要 credential，在录制开始前、recorded region 外设置它。

**Core principle：** secrets 应影响 environment，而不是 visible transcript。隐藏的 *real* setup 优于可见的 *fake* setup：fake setup 会破坏 demo，并仍泄露 secret 的形状。

- **Plan it out of frame.** 将任何 secret 可能出现的 surface（env exports、CLI flag values、command output、auth headers、URL params、DevTools、config pages）都移出 recorded region。使用 VHS `Hide`/`Show`；通过 env vars 调用 CLIs，而不是使用 secret flag values；停留在 user-facing pages。展示 authenticated result，而不是 auth step。
- **不要在 recording 内替换 placeholders。** 输入 fake `sk-xxxxx` 会产生误导性 artifact；应该改为在画面外设置真实 credential 并重新捕获。两个具体失败：
  - 可见地重新 export fake value（`export API_KEY=REDACTED`）会覆盖真实 env var，导致 demo 破坏（401、`Unauthorized`、`0 credits remaining`、empty output）。你既泄露了 variable name，*又* ship 了 broken product。
  - 计划之后 blur 或 crop。假设任何显示出来的内容都已泄露；recapture 是唯一补救。
- **上传前扫描。** 查找 `sk-`、`ghp_`、`ghs_`、`xoxb-`、`Bearer `、`Authorization:`、`?token=`、`api_key=`、credential-sounding labels 附近的长 hex/base64，或可见的 `.env` 内容。如果出现任何一个，丢弃并重新捕获。绝不要 blur 或 crop。

## Arguments（参数）

Parse `$ARGUMENTS`（解析 `$ARGUMENTS`）:
- **What to capture**：要展示的 feature 或 behavior 描述。如果提供，用它指导访问哪些页面、运行哪些命令或捕获哪些 states。
- 如果为空，从可恢复的 branch 或 PR context 推断要捕获什么。如果之后 target 仍不明确，继续前询问用户想展示什么。

## Step 0: 发现 Capture Target（捕获目标）

将 target discovery 视为 stateless 且 branch-aware。agent 可能在工作已完成后的 fresh session 中被调用，所以不要依赖 conversation history，也不要假设 caller 知道正确 artifact。

如果由另一个 skill 调用，将 caller-provided target 视为提示，而不是证明。在捕获任何内容前，重新运行 target discovery 和 validation。

使用最轻量的可用 context 识别最佳 evidence target：

- Current branch name（当前分支名）
- Open PR title and description（如果存在）
- Changed files 和相对 base branch 的 diff
- Recent commits（最近 commits）
- 只有当 plan file 明显被 branch、PR、arguments 或 caller context 引用时，才使用它

形成 capture hypothesis："The best evidence appears to be [behavior]."

只有当恰好存在一个 high-confidence observable behavior，且能从 workspace 中合理 exercise 它时，才不询问直接继续。当多个 behaviors 都合理、diff 未揭示如何 exercise behavior，或 requested target 无法映射到 product surface 时，询问用户要展示什么。

当 diff 是 docs-only、markdown-only、config-only、CI-only、test-only，或无 observable output change 的纯 internal refactor 时，带清晰原因跳过 evidence。

## Step 1: 实际使用 Feature（功能）

捕获任何内容前，通过实际使用 feature 来验证它可用：

- **CLI tool**：运行 new/changed command 并确认 output 正确
- **Web app**：导航到 new/changed page 并确认渲染正确
- **Library**：运行使用 new/changed API 的 example code
- **Bug fix**：复现原始 bug scenario 并确认已修复

使用 feature 构建所在的 workspace。不要从零 reinstall。如果 setup 需要 credentials 或 services，使用平台的 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到聊天提问；不要仅因为需要加载 schema 就退回。绝不要静默跳过问题。

## Step 2: 检测 Project Type（项目类型）

使用 Step 0 的 capture target 决定要分类哪个目录。如果 diff 触及带有自己 package manifest 的特定 subdirectory（例如 `packages/cli/`、`apps/web/`），将其作为 root 传入。否则使用 repo root。

```bash
python3 scripts/capture-demo.py detect --repo-root [TARGET_DIR]
```

这会输出带 `type` 和 `reason` 的 JSON。结果是 signal，而不是 gate。如果 agent 从 Step 0 得出的理解与脚本分类矛盾（例如 diff 明显改变 CLI behavior，但 repo root 因为 sibling Next.js app 被分类为 `web-app`），以 agent 的判断为准。

## Step 3: 评估 Change Type（变更类型）

Step 0 已处理 "no observable behavior" early exit。此步骤将确实有 observable behavior 的 changes 分类为 `motion` 或 `states`，用于指导 tier selection。

如果 arguments 描述了要捕获什么，就基于该描述分类。否则使用 Step 0 的 diff context。

**Change classification（变更分类）：**

1. **涉及 motion 或 interaction？**（animations、typing flows、drag-and-drop、real-time updates、continuous CLI output）-> 分类为 `motion`。
2. **涉及 discrete states？**（before/after UI、new page、带 output 的 command、API response）-> 分类为 `states`。

| Change characteristic（变更特征） | Classification（分类） |
|---|---|
| Animations, typing, drag-and-drop, streaming output | `motion` |
| New UI, before/after, command output, API responses | `states` |

**Feature vs bug fix -- 展示什么：**

- **New feature (`feat`)**：展示 feature 可用。展示 hero moment：feature 正在发挥作用。
- **Bug fix (`fix`)**：展示 before AND after。复现原始 broken state（如果可能），然后展示 fix。如果 broken state 无法复现（workspace 中已经修好），捕获 fixed state 并描述之前 broken 的内容。

从 commit messages、branch name 或 plan file frontmatter（`type: feat` 或 `type: fix`）推断 feat vs fix。如果不清楚，询问。

## Step 4: Tool Preflight（工具预检）

运行 preflight check：

```bash
python3 scripts/capture-demo.py preflight
```

这会输出 JSON，列出每个 tool 的 boolean availability：`agent_browser`、`vhs`、`silicon`、`ffmpeg`、`ffprobe`。基于结果为用户打印 human-readable summary，并注明缺失工具的安装命令（例如 vhs 用 `brew install charmbracelet/tap/vhs`，silicon 用 `brew install silicon`，ffmpeg 用 `brew install ffmpeg`）。

## Step 5: 创建 Run Directory（运行目录）

在 OS temp location 创建 per-run scratch directory：

```bash
mktemp -d -t demo-reel-XXXXXX
```

将输出作为 `RUN_DIR`。把这个具体 run directory 传给每个 tier reference。Evidence artifacts 是 ephemeral：它们会被上传到 public URL，然后丢弃。OS temp directory 才是它们的合适位置，不是 repo tree。

## Step 6: 推荐 Tier 并询问用户

使用 Step 2 的 project type、Step 3 的 change classification，以及 Step 4 的 preflight JSON 运行 recommendation script：

```bash
python3 scripts/capture-demo.py recommend --project-type [TYPE] --change-type [motion|states] --tools '[PREFLIGHT_JSON]'
```

这会输出 JSON，包含 `recommended`（best tier）、`available`（工具存在的 tiers 列表）和 `reasoning`。

通过平台的 blocking question tool 向用户呈现 available tiers：Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到聊天中的编号选项；不要仅因为需要加载 schema 就退回。绝不要静默跳过问题。标记 recommended tier。始终把 "No evidence needed" 作为最后一个选项。

**Question（问题）:** "How should evidence be captured for this change?"

**Options**（只展示 `available` 列表中的 tiers，按推荐顺序排序）：
1. **Browser reel** -- Agent-browser screenshots 拼接成 animated GIF。最适合 web apps。
2. **Terminal recording** -- VHS terminal recording 到 GIF。最适合带 interaction/motion 的 CLI tools。
3. **Screenshot reel** -- Styled terminal frames 拼接成 animated GIF。最适合 discrete CLI steps。
4. **Static screenshots** -- 单个 PNGs。其他工具不可用时的 fallback。
5. **No evidence needed** -- diff 本身已足够。最适合 text-only 或 config changes。

如果 question tool 不可用（background agent、batch mode），呈现编号选项，并等待用户回复后再继续。

## Step 7: 执行 Selected Tier（所选层级）

将 Step 0 的 capture hypothesis 和 Step 1 的 feature exercise results 带入 tier execution：它们决定要访问哪些具体页面、运行哪些命令，或截取哪些 states。在 tier reference 中用 Step 5 的具体路径替换 `[RUN_DIR]`。

为 selected tier 加载对应 reference file：

- **Browser reel** -> Read（读取）`references/tier-browser-reel.md`
- **Terminal recording** -> Read（读取）`references/tier-terminal-recording.md`
- **Screenshot reel** -> Read（读取）`references/tier-screenshot-reel.md`
- **Static screenshots** -> Read（读取）`references/tier-static-screenshots.md`
- **No evidence needed** -> 跳到 output。将 `evidence_url` 设为 null，`evidence_label` 设为 null。

**Runtime failure fallback：** 如果 selected tier 在执行期间失败（tool crashes、server not accessible、recording produces empty output），回退到下一个 available tier，而不是整体失败。fallback 顺序是：browser reel -> static screenshots，terminal recording -> screenshot reel -> static screenshots，screenshot reel -> static screenshots。Static screenshots 是最终 fallback；如果连它也失败，报告失败并让用户决定。

## Step 8: Upload and Approval（上传与确认）

selected tier 产出 artifact 后，读取 `references/upload-and-approval.md`，用于上传到 public host、user approval gate 和 markdown embed generation。

## Output（输出）

向 caller 返回这些值（例如 ce-commit-push-pr）：

```
=== Evidence Capture Complete ===
Tier: [browser-reel / terminal-recording / screenshot-reel / static / skipped]
Description: [1 sentence describing what the evidence shows]
URL: [public URL or "none" (multiple URLs comma-separated for static screenshots)]
Path: [local file path or "none" (multiple paths comma-separated for static screenshots)]
=== End Evidence ===
```

`Description` 是从 Step 0 的 capture hypothesis 派生的一行 summary（例如 "CLI detect command classifying 3 project types and recommending capture tiers"）。caller 决定如何将 URL(s) 格式化到 PR description 中。

- `Tier: skipped` 表示未捕获 evidence；`URL` 和 `Path` 都是 `"none"`。
- 上传到 catbox 时：`URL` 包含 public URL，`Path` 为 `"none"`。
- 保存到本地时：`Path` 包含 local file path，`URL` 为 `"none"`。
- 对所有 non-skipped tiers，`URL` 或 `Path` 中恰好一个包含真实值；另一个为 `"none"`。

**Label convention（标签约定）:**
- Browser reel、terminal recording、screenshot reel：label 为 "Demo"
- Static screenshots：label 为 "Screenshots"
- caller 在格式化时应用 label。ce-demo-reel 不生成 markdown。
- Test output 绝不会被标记为 "Demo" 或 "Screenshots"
