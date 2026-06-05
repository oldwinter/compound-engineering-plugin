---
name: lfg
description: 端到端运行完整 autonomous engineering pipeline（plan、work、code review、test、commit、push、open PR、watch CI，并修复 CI failures 直到 green）。仅当用户明确要求 hands-off 执行软件任务并提供 feature description 时使用；不要把闲聊自动路由到这里。
argument-hint: "[feature description 功能描述]"
---

CRITICAL：你 MUST 按顺序执行下面每一步。Do NOT 跳过任何 required step。Do NOT 提前进入 coding 或 implementation。plan phase（step 1）MUST 在任何 work 开始前完成并验证。违反这个顺序会产生糟糕输出。

调用下面引用的任何 skill 时，都要根据 host platform 提供的 available-skills list 解析其名称，并使用完全一致的条目。有些平台会在 plugin namespace 下列出 skills（例如 `compound-engineering:ce-plan`）；其他平台只列出裸名称。调用列表中不存在的 short-form guess 会失败；在调用 Skill/Task tool 之前，始终逐字匹配已列出的条目。

1. 使用 `$ARGUMENTS` 调用 `ce-plan` skill。

   GATE：STOP。如果 ce-plan 报告该任务是 non-software，无法以 pipeline mode 处理，停止 pipeline，并告知用户 LFG 需要软件任务。否则，验证 `ce-plan` workflow 是否在 `docs/plans/` 中产出了 plan file。如果没有创建 plan file，再次用 `$ARGUMENTS` 调用 `ce-plan`。在 written plan 存在前，Do NOT 进入 step 2。**记录 plan file path**，它会在 step 3 传给 ce-code-review。

2. 调用 `ce-work` skill。

   GATE：STOP。验证 implementation work 已完成：除 plan 外，有文件被创建或修改。如果没有 code changes，Do NOT 进入 step 3。

3. 使用 `mode:agent plan:<plan-path-from-step-1>` 调用 `ce-code-review` skill。

   传入 step 1 中的 plan file path，让 ce-code-review 能验证 requirements completeness。读取该 skill 输出的 **Actionable Findings** summary。

4. **Apply and persist review fixes**（step 3 之后、residual handoff 之前 REQUIRED）

   加载 `references/review-followup.md` 并执行其中的 step 4（mechanical apply，并在存在 changes 时 commit/push）。当 eligible review fixes 仍只存在于 working tree 且未 commit 时，不要进入 step 5、运行 browser tests 或输出 DONE。

5. **Autonomous residual handoff**（仅当 step 3 报告一个或多个未在 step 4 应用的 actionable `downstream-resolver` findings 时执行；如果报告 `Actionable findings: none.`，跳过）

   不要询问用户。此步骤遵循 autopilot contract：residuals 必须在 DONE 前变成 durable，但 agent 不会停下来询问。

   1. 以 **non-interactive mode** 加载 `references/tracker-defer.md`。传入 step 3/4 的 residual actionable findings（如果 summary 被截断，则传入 run artifact）。
   2. 收集结构化返回：`{ filed: [...], failed: [...], no_sink: [...] }`。
   3. 根据结构化返回组成 `## Residual Review Findings` markdown section：
      - 对 `filed` 中的每项：包含 severity、file:line、title，以及 tracker ticket URL 链接的 bullet。
      - 对 `failed` 中的每项：包含 severity、file:line、title 和失败原因（例如 `Defer failed: gh returned 401 — tracker unavailable`）的 bullet。
      - 对 `no_sink` 中的每项：逐字 inline severity、file:line 和 title，使 PR body 或 fallback file 成为 durable record。
   4. 不询问用户，检测当前 branch 的 open PR：

      ```bash
      gh pr view --json number,url,body,state
      ```

   5. 如果存在 open PR，直接用 `gh` 更新；不要加载任何 confirmation-driven PR update skill。向当前 PR body 追加或替换 `## Residual Review Findings` section，将新 body 写入 OS temp file，然后运行：

      ```bash
      gh pr edit PR_NUMBER --body-file BODY_FILE
      ```

   6. 如果不存在 open PR，在 `docs/residual-review-findings/<branch-or-head-sha>.md` 创建 tracked fallback file，包含组成的 section 和 source PR-review run context。只 stage 该文件，用 `docs(review): record residual review findings` commit，并 push 当前 branch。如果存在 upstream，运行 `git push`。如果没有 upstream，动态解析可写 remote：存在 `origin` 时优先使用，否则运行 `git remote` 并选择第一个已配置 remote。然后运行 `git push --set-upstream <remote> HEAD`。这是 durable no-PR sink。在已有 PR body 已更新或 fallback file commit 已 pushed 之前，不要输出 DONE。如果两条路径都失败，停止并报告失败命令；不要静默继续。

   一旦 residuals 已 durable recorded，就不要因为 tracker filing failures 阻塞 DONE。只有当 findings 出现在 PR body 或 pushed fallback file 中时，`no_sink` outcome 才算成功。

6. 使用 `mode:pipeline` 调用 `ce-test-browser` skill。

7. 调用 `ce-commit-push-pr` skill。

   这会 commit 任何 remaining changes、push branch，并打开 pull request。如果 step 5 已经打开 PR（用 `gh pr view --json number,url,state 2>/dev/null` 检查），跳过 PR 创建，但仍然 commit 并 push 任何 uncommitted changes。

8. **CI watch and autofix loop**（仅当当前 branch 存在 open PR 时）

   检测 PR；如果不存在或 `gh` 不可用，完全跳过此步骤并进入 step 9。

   ```bash
   gh pr view --json number,url,state
   ```

   最多重复 **3 个 fix iterations**：

   1. 等待 CI 完成：

      ```bash
      gh pr checks --watch
      ```

      如果命令以 0 退出，说明所有 checks passed。跳出 loop 并进入 step 9。

      如果非 0 退出，说明一个或多个 checks failed。继续到 (2)。

   2. 识别 failing checks 并拉取 failure logs。使用 `gh pr checks --json name,state,conclusion,workflow,link` 枚举 failures，然后为每个 failing check 读取 run logs：

      ```bash
      gh run view <run-id> --log-failed
      ```

      其中 `<run-id>` 从 check details URL 或 workflow run 解析。

   3. 阅读 failure logs，识别 root cause，并在 working tree 中应用 fix。Do NOT 弱化、跳过或 mock failing assertion 来让它通过；修复真实问题。如果 failure 是没有修复路径的 flaky test，将其记录为下面的 residual outcome，而不是在没有 code change 的情况下重试。

   4. 只 stage 你修改的文件，commit 并 push：

      ```bash
      git add <changed-files>
      git commit -m "fix(ci): <one-line summary of the failure repaired>"
      git push
      ```

   5. 带着下一个 attempt counter 返回 iteration (1)。

   GATE：3 次失败尝试后停止迭代。如果 3 个 fix cycles 后 CI 仍然 red：

   - 组成 `## CI Failures Unresolved` markdown section，列出每个 remaining failing check、failure summary 和 run/check URL。
   - 向 PR body 追加或替换这个 section，将新 body 写入 OS temp file，然后运行：

     ```bash
     gh pr edit PR_NUMBER --body-file BODY_FILE
     ```

   - Do NOT 继续 loop。autopilot contract 是“make residuals durable, then exit”。进入 step 9。

9. 完成时输出 `<promise>DONE</promise>`

现在从 step 1 开始。记住：plan FIRST，然后 work。绝不要跳过 plan。
