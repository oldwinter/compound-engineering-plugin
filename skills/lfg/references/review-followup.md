# Review followup（review 跟进，LFG step 4-5）

`ce-code-review` 只负责 review。LFG 自行应用 eligible fixes，然后 commit。

## Step 4 - invoke review（调用 review）

```
ce-code-review mode:agent plan:<plan-path-from-step-1>
```

读取 **Actionable Findings** summary 和 artifact path。不要传 `mode:autofix`。

捕获 parsed JSON（`status`、`actionable_findings`、`findings`、`artifact_path`、`run_id`）或 markdown Actionable Findings section。如果 `status` 为 `failed`，停止并展示 `reason`。

## Step 5 - apply and persist review fixes（应用并持久化 review 修复）

### 应用什么

只有在**全部**条件满足时，才在 working tree 中应用 finding：

1. **存在 `suggested_fix`**：reviewer 给出了具体 change shape。
2. **`confidence` 为 `100`，或为 `75` 且 report 中注明 cross-persona agreement**：不要应用 anchor-50 findings。
3. **修复是 mechanical 的**：一个 coherent change，不改变 contract/permission/security posture，不新增 public API shape，不做需要 product sign-off 的 behavior change。
4. **Evidence 在编辑前仍匹配** cited `file:line` 的 code。

不要把 `autofix_class` 当成 auto-apply permission。

### 不应用什么

- `autofix_class: manual` 且没有 clear mechanical `suggested_fix`
- `autofix_class: advisory`：仅报告
- 会改变 behavior、contracts、auth 或 permissions 的 `gated_auto` findings
- 任何需要 design conversation 的内容

### Execution（执行）

1. 用上面的 bar 过滤 `actionable_findings`（或 markdown Actionable Findings）。
2. 按 severity order（review 中稳定的 `#`）在 working tree 中应用 eligible fixes。
3. 当任一已应用 finding 上有 `requires_verification: true` 时，运行 targeted tests。
4. 如果 `git status --short` 显示 changes，只 stage review-driven files，commit `fix(review): apply review findings`，并在 step 6 前、且配置了 remote 时 push（这是 LFG shipping precondition）。Push 方式：如果存在 upstream，运行 `git push`。如果没有 upstream 但配置了 remote（fresh feature branch 上常见，因为 step 8 的 `ce-commit-push-pr` 尚未运行），动态解析 writable remote：存在 `origin` 时优先用 `origin`，否则用 `git remote` 并选择第一个已配置 remote。然后运行 `git push --set-upstream <remote> HEAD`。如果完全没有 remote，不要 push，本地 commit 就足够。如果没有应用 eligible fixes，明确说明并跳过 commit。

## Step 6 - residual handoff（剩余问题交接）

Residuals 是 step 5 中**未**应用的 actionable findings，不是 in-skill autofix 剩下的内容。使用 step 4 的 Actionable Findings summary / artifact。
