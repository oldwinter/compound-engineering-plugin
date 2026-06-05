# `ce-demo-reel`

> 为 PR descriptions 捕获 visual demo reel：GIF、terminal recording、screenshots。真实 product usage，不是 test output。

`ce-demo-reel` 是 **evidence capture** skill。它会检测 project type，推荐合适 capture tier（browser reel / terminal recording / screenshot reel / static screenshots），记录真实 feature in action，上传到 public URL，并返回可直接放入 PR description 的 markdown。**Evidence 指使用 product**，不是运行 tests；"I ran npm test" 是 test evidence。Capture 是运行真实 CLI command、打开 web app、发出 API call，或触发 feature。

它最常由 `/ce-commit-push-pr` 在 change 有 observable behavior 时调用，也可在事后直接调用，把 demo 加到 PR description 中。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 检测 project type、选择 capture tier、记录 feature in action、上传，并返回可放入 PR 的 markdown |
| 何时使用 | Shipping UI changes、CLI features、带 runnable examples 的 API behavior；任何 visual evidence 有帮助的场景 |
| 产出什么 | Public URL（或 local path）以及可供 `ce-commit-push-pr` splice 进 PR body 的 `Tier`/`Description` |
| Tiers | Browser reel、terminal recording、screenshot reel、static screenshots、no evidence needed |

---

## 问题

没有 evidence 的 PR descriptions 会更弱，原因很可预测：

- **Reviewers 看不到 change**：他们必须 clone、build、run、reproduce，才能验证 UI render
- **Visual regressions 沉默无声**：没有 recorded baseline，未来 regression 可能数周无人注意
- **压力下 evidence 会被伪造**：当捕获真实 flow 太难时，agents 会用 test output 替代并标成 "Demo"
- **Capturing 吃掉注意力**：选择工具、设置 window size、找 public host、生成 markdown，都会分散 shipping 精力
- **Secrets 泄露进 recordings**：CLI output、URL bars、DevTools、env exports 中的 credentials，会随 demo 一起 ship
- **Local-only artifacts**：录屏留在磁盘上，没有进入 PR description；或 local file 移动后断掉

## 方案

`ce-demo-reel` 以 structured capture flow 运行，并带 explicit fallbacks：

- **Project detection** 自动选择正确 tier（web apps 用 browser reel，CLIs 用 terminal recording）
- **Real product usage**：skill 先 exercise feature 验证它工作，再 capture
- **Tier fallback chain**：所选 tier 失败时，skill 会降级到下一个可用 tier，而不是让 run 失败
- **Secret-safe by design**：recordings 只保留 visible transcript；secrets 留在 env vars 或画面外；pre-upload scan 捕捉 leaks
- **Test output 永远不标成 "Demo"**：这一区分是绝对的
- **Upload to public host**：返回可嵌入 `## Demo` 的真实 public URL
- **Irrelevant 时 clean skip**：docs-only、markdown-only、internal refactors 得到明确的 "no evidence needed"，而不是 fake substitutes

---

## 它的新意

### 1. Evidence 指使用 product：严格区分 test output

Skill 强制绝对区分：**evidence 是运行真实 CLI command、打开 web app、发出 API call 或触发 feature。** Test output（`npm test`、`pytest` 等）永远不会被标为 "Demo" 或 "Screenshots"。如果真实 product usage 不可行（需要 API keys、cloud deploy、paid services、bot tokens），skill 会明确说明并推荐 fallback，而不是静默用 test output 代替。

### 2. 四个 tiers：按 project type 和 change shape 选择

| Tier | When（何时使用） |
|------|------|
| **Browser reel** | 有 motion 或 interaction 的 web apps（forms、transitions、real-time updates）：agent-browser screenshots stitched into animated GIF |
| **Terminal recording** | 有 motion 的 CLI tools（typing flows、streaming output）：VHS recording to GIF |
| **Screenshot reel** | 有 discrete steps 的 CLI：styled terminal frames stitched into GIF |
| **Static screenshots** | 其他 tools 不可用时 fallback；或天然是 discrete states |
| **No evidence needed** | Docs-only、config-only、CI-only、test-only 或 pure internal refactors |

Recommendation 会综合 project type（web-app vs CLI）、change classification（motion vs states）和 tool availability（preflight check 确认 installed）。用户在 available tiers 中选择。

### 3. Stateless target discovery：branch-aware，不依赖 session

Skill 假设它可能在 fresh session 中、work 已经完成后被调用。它不依赖 conversation history，也不假设 caller 知道正确 artifact。Target discovery 使用：current branch name、open PR title 和 description、changed files 和 diff、recent commits，以及只有在明显 referenced 时才使用的 plan file。当由其他 skill 调用时，caller-provided target 只作为 hint，不是 proof；capture 前，skill 会重新运行 target discovery 和 validation。

### 4. Secret-safety by design：transcript hygiene，而不是事后 blur

Skill 永远不记录 credentials。Secrets 影响 environment，不出现在 visible transcript：

- 把 secrets 规划到画面外：recording 前设置 env vars，CLI 通过 env vars 调用而不是 flag values，展示 authenticated states 而不是 auth steps
- **Recordings 内不要 placeholder substitution**：输入 fake `sk-xxxxx` 会生成 misleading artifact，也可能破坏 demo（fake env var 覆盖真实值导致 `401 Unauthorized`）
- **Pre-upload scan**：查找 `sk-`、`ghp_`、`Bearer`、`Authorization:`、`?token=`、`api_key=`，以及 credential-sounding labels 附近的 long hex/base64。一旦出现，discard 并 recapture。绝不 blur 或 crop。

### 5. Runtime fallback chain（运行时 fallback 链）

如果 selected tier 执行中失败（tool crashes、server unreachable、recording 产出 empty output），skill 会 fallback 到下一个 available tier，而不是让整个 run 失败：

- Browser reel -> static screenshots（静态截图）
- Terminal recording -> screenshot reel -> static screenshots（静态截图）
- Screenshot reel -> static screenshots（静态截图）
- Static screenshots -> 向用户报告 failure

### 6. Pre-flight tool detection（预检工具检测）

Capture 前，preflight script 会检查 tool availability（`agent_browser`、`vhs`、`silicon`、`ffmpeg`、`ffprobe`），并输出哪些 tiers 可用。Skill 会打印 missing tools 的 install commands（`brew install charmbracelet/tap/vhs`、`brew install silicon`），用户可自行启用更 rich tiers。

### 7. OS temp 中的 per-run scratch directory

每次 capture 都会在 OS temp 中创建 per-run directory（`mktemp -d -t demo-reel-XXXXXX`）存放 ephemeral artifacts。Recordings 会上传到 public host 后丢弃，不污染 repo tree。用户只看到 final URL。

### 8. 给 upstream callers 的 stable output contract

Skill 返回 structured envelope（`Tier`、`Description`、`URL`、`Path`），其中 `URL` 或 `Path` 恰好一个带真实值（另一个是 `"none"`）。Caller，通常是 `/ce-commit-push-pr`，会把它格式化进 PR description 的 `## Demo` 或 `## Screenshots` section。Static screenshots 使用 "Screenshots" label；所有 motion tiers 使用 "Demo"。Test output 永远不使用任一 label。

---

## 快速示例

你完成 notification settings page。调用 `/ce-commit-push-pr`，它检测到 observable behavior 并询问是否 capture evidence。你回答 yes。它加载 `/ce-demo-reel`。

Skill 从 branch + PR diff 发现 target：一个带 toggles 的 settings page route。它 exercise feature（导航到 `/settings/notifications`，切换几个 options，验证 hot-reload works）。检测 project type 为 `web-app`（Next.js）。将 change 分类为 `motion`（toggle state changes、micro-animations）。

Preflight 发现 `agent_browser` 和 `ffmpeg` 可用，推荐 **browser reel**。你确认。Skill 通过 agent-browser 截取 toggle flow 的一系列 screenshots，用 ffmpeg 拼成 GIF，扫描 secrets（未发现），上传到 public host，并返回 URL。

`/ce-commit-push-pr` 把带 GIF embed 的 `## Demo` splice 到 PR body。总耗时约 30 秒。

---

## 何时使用

在以下情况使用 `ce-demo-reel`：

- PR 有值得展示的 observable behavior（UI render、CLI output、带 runnable example 的 API call）
- Bug fix 有值得展示的 before/after
- Feature 需要 prose 无法捕捉的 interaction 或 motion
- Shipping CLI feature 且 output formatting 很重要

以下情况跳过 `ce-demo-reel`：

- Change 是 docs-only、markdown-only、CI-only、test-only 或 pure internal refactor：选择 "No evidence needed"
- 真实 product usage 需要你没有的 resources（paid services、cloud deploy、bot tokens）：明确说明，而不是伪造
- Diff 确实 self-explanatory

---

## 作为 Workflow 的一部分使用

当 behavior observable 时，其他 skills 会调用 `ce-demo-reel`：

- **`/ce-commit-push-pr` Step 6**：当 change 有 UI / CLI / API behavior 时调用此 skill，并询问用户是否 capture
- **`/ce-work` Phase 4.1**：Evidence Context，标记 evidence 是否可行，让 `ce-commit-push-pr` 能问对问题

Skill 返回 `Tier`、`Description`、`URL`、`Path`；caller 决定如何把 result 格式化进 PR description。

---

## 单独使用

Skill 也可直接调用：

- **PR 已经打开后**：`/ce-demo-reel "the new settings page"`，给 existing PR 添加 demo
- **特定 behavior**：`/ce-demo-reel "CLI output of the migrate command"`
- **无 description**：`/ce-demo-reel` 从 branch/PR/diff context infer，ambiguous 时询问

当不通过 `ce-commit-push-pr` 调用时，用户通常手动把返回 markdown 复制到 PR description，或另外使用 `gh pr edit --body-file`。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 从 branch/PR/diff context infer target；ambiguous 时询问 |
| `<description>` | 例如 "the new settings page"、"CLI output of the migrate command" |

Tier selection 会在 recommendation 计算后作为 blocking question 提供；用户在 available tiers 中选择。

---

## 常见问题

**为什么 test output 不是 evidence？**
Tests 证明 isolated logic；它们不能说明 feature 对用户是否有效。Reviewer 需要知道 "what does this look like when used"，不是 "do the unit tests pass"（CI 会显示）。严格区分可防止 agents 用容易的 test runs 替代较难的 real-product captures。

**如果真实 evidence 需要我不想录进去的 credentials 怎么办？**
在 recording 开始前、recorded region 外设置 credential。展示 *authenticated result*，不是 auth step。不要在 recording 内输入 `export API_KEY=fake`；这会覆盖真实 env var 并破坏 demo（`401 Unauthorized`）。如果无法在不显示 secret 的情况下 capture，请说明并选择 "No evidence needed" 或推荐 fallback。

**如果 chosen tier 在 capture 中途失败怎么办？**
Skill 会 fallback 到下一个 available tier，而不是完全失败。Browser reel -> static screenshots。Terminal recording -> screenshot reel -> static screenshots。如果 static screenshots 也失败，skill 会报告 failure，并让你决定。

**GIF 或 screenshot 存在哪里？**
Per-run artifacts 存到 OS temp（`/tmp/...`）并上传到 public host。Local files 是 ephemeral。URL 放入 PR description；local copies 会丢弃。

**`--full` page screenshots 怎么办？**
Static screenshot tier 支持通过 agent-browser 的 `screenshot --full` 捕获 tall pages 的 full-page captures。Skill 会根据展示内容选择正确 capture mode。

**为什么不自动 blur 漏进去的 secrets？**
因为 partial blur 是已知不可靠 mitigation；即使 cropped 或 blurred secrets，也可能通过 metadata、frame edges 或 visible patterns 泄漏。Skill 的纪律是：upload 前 scan，如有任何像 secret 的内容就 recapture。Recapture 是唯一 remediation。

---

## 另请参阅

- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - primary caller；把 captured evidence splice 进 PR descriptions
- [`ce-work`](./ce-work.md) - 在 Phase 4.1 标记 evidence context，让 PR flow 能问对问题
- [`ce-test-browser`](./ce-test-browser.md) - sibling skill，用于 end-to-end browser testing（不同目标：verify behavior，而不是 capture）
