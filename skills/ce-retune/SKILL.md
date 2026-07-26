---
name: ce-retune
description: "Retune a skill corpus for a new model, measurement-first: mine the run archive for a baseline, establish a noise floor, audit the corpus adversarially, then cut in measured passes until a pre-registered bar clears. Requires a benchmark harness that can A/B two builds of the corpus; refuses without one."
disable-model-invocation: true
argument-hint: "[target model or symptom] [path to the corpus, defaults to ./skills] [bar:<n> consecutive clean runs]"
---

## 中文导读

本 skill 用于在模型升级导致 skill 语料库表现退化时，先测量、再裁剪。开始前必须确认三项条件：存在可分析的运行归档或可生成归档的 benchmark harness；harness 能选择不同语料库构建；有一项可重复执行的端到端任务。任一条件缺失时，明确指出缺口并停止，不要把静态审计包装成 retune。

执行顺序不可调换：先从历史归档建立基线，再用同一 commit 的两个副本完成 A/A 测试并预先登记通过门槛；随后按 skill 单元开展带反方辩护的审计，以互不重叠的文件所有权分批裁剪；每一批都重新测量，让失败位置决定下一次修改。流程遵循度与任务完成度必须作为两项独立指标，空 transcript、错误退出和基础设施故障归入 `broken`，不计入成功率分子或分母。

只有预先登记的门槛通过，或报告明确说明无法支持哪项结论，才算结束。测试通过只能证明没有破坏现有契约，不能证明行为改善。逐批单独提交并保留基线表、noise floor、逐次运行记录及被证伪的假设。下方英文内容是 canonical executable prompt contract；命令、字段、统计公式、停止条件和阶段顺序均须按原文执行。

# Retune a Corpus for a New Model

A corpus that degrades on a new model is a measurement problem before it is a writing problem. Reading the prose and rewriting what looks wrong produces a plausible fix list and no way to know whether any item mattered.

**Outcome:** a corpus whose measured behavior on the target model clears a bar registered before any change, with the regression classes removed and each removal attributable.

**Done:** the bar is cleared, or the run reports the specific claim it could not support. A green test suite is not done: it proves nothing broke, not that behavior improved.

**Non-goal:** word reduction. Leanness and performance are separate programs that happen to share a corpus, and only one of them is the result. Report completion, not word count.

## Phase 0: the measurement gate — check this first

This skill cannot run without a way to observe behavior. Check for all three, and name whichever is missing:

1. **A run archive or a harness that produces one** — per-run logs carrying the tool-call trace, a terminal marker, token counts, and the final message.
2. **A build selector** — the harness can point a run at a specific source checkout of the corpus (a `--plugin-dir`-style override, a configurable skills path, an env var), so two builds are comparable under one runner.
3. **A repeatable task** the corpus actually executes end to end.

If any is missing, **stop and say so**, naming what to build. Do not fall back to a static audit and present it as retuning: an audit can say what looks cuttable and can never say whether cutting helped, which is the error this skill exists to prevent. An audit-only pass is a legitimate thing to want; it is a different request.

State the target model and the harness you found before continuing.

## Phase 1: mine the archive before spending a run

Historical runs are a free baseline, usually larger than any experiment affordable this week. Read `references/baseline-mining.md` and follow it.

It carries the outcome taxonomy, the fields to extract, and the two corrections that decide whether the baseline is usable at all:

- **Broken runs are a first-class outcome, not a failure.** Empty transcripts and error exits score as model failures and silently inflate every effect. Exclude them and check whether they land evenly across arms; a lopsided split is a harness fault wearing a model-effect costume.
- **Track "followed the process" and "did the job" separately.** A run can complete the task while skipping the workflow entirely. Collapsed into one number, that reads as success.

## Phase 2: establish the noise floor before any claim

Run the harness against **two identical copies** of the corpus, same commit on both sides. Whatever difference appears is noise, and it is the floor every later claim must clear.

Read `references/noise-floor.md` for the protocol, the interleaving rule, and the power calculation that converts the observed variance into a required sample size.

Register the bar **now**, in writing, before any change exists. A bar chosen after seeing results is not a bar.

Expect the floor to be wider than intuition suggests. If a corpus produces a large spread on fixed inputs, then every small-sample claim about it — including any prior report you were handed — sits inside the envelope of doing nothing.

## Phase 3: audit the corpus, adversarially

One agent per skill, each reading that skill's full directory, proposing cuts with a target and a reason. Then a second agent per skill whose job is the opposite: **defend the existing prose** using the project's own documented learnings, its tests, and git history.

Read `references/corpus-audit.md` for the dispatch shape, the finding schema, and the classes worth hunting.

Two rules make the difference between an audit and a demolition:

- **A cut with no provenance found after a real search is a confident cut. A cut the defender saves with a citation is off the list.** Do not relitigate a defended keep.
- **Absence of evidence is weaker than the project's own standard for a change.** Where the guidance requires a reproduced failure or an exact failing path, a search that found nothing is a verification task, not a change. Say which of your cuts rest on that weaker basis.

Expect the audit to contradict the premise you started with. That is its value.

## Phase 4: cut in surgical passes

One problem per agent, each owning a disjoint file set so parallel work cannot collide. Read `references/cut-passes.md` for the loop, the isolation rules, and the shared-asset trap.

`references/halt-taxonomy.md` carries the regression classes to hunt, with the before and after of each. Load it when the symptom is stalling, halting, or a run that ends while naming work it did not do. Every one of those classes reduces to prose written as if a second party were waiting, and the fix is never to add capability.

Discipline that survives contact:

- **Fix at the smallest owning layer.** Reword only when rewording is the smallest mechanism; prefer deleting the structure that made the wording necessary.
- **Field names, enums, greppable markers and security guards are data.** They stay. What goes is the justification clause around them that teaches the model a separate consumer is waiting.
- **Not every stop is the enemy.** Some workflows exist to stop and ask; that is the product. Sort every stop by who is actually on the other side before touching it.
- **Never edit tests to make a suite green.** A removed string a test pins is a finding to report, not a test to weaken.

## Phase 5: measure, then let the failure choose the next fix

After each pass, run the harness and read **where** it failed, not just whether it did.

A failure that moves to a later phase is progress and names the next target. A failure at the same site means the fix missed. A run that completes the task while skipping the workflow is a different defect than a halt, and only shows up if Phase 1's two metrics stayed separate.

Loop Phase 4 and 5 until the registered bar is cleared. Then stop; a bar cleared is done.

**Audit the phases the instrument cannot reach.** A probe that skips a phase can never fail in it, so a green streak certifies only what it exercised. List the phases your task never enters, read those files, and treat what you find there as equal in weight to what the runs found. Some of the most consequential defects live where no test looks.

**Report the limit.** Name the paths that remain unmeasured and what would be needed to measure them. Do not let a cleared bar imply coverage it does not have.

## Phase 6: ship

Commit each pass separately with its own message so the history says which change was made and why, and so release tooling can classify intent. Keep the measurement artifacts.

Then write the finding down where the next person will hit it: the mechanism, the before and after, the measured numbers, and the hypotheses that died. **Record the ones that died.** They are what stops the next attempt from re-running a dead end, and they are the part every write-up omits.

## Workflow shapes

Each phase has an orchestration shape that fits it, and using the wrong one is the common failure. Read `references/workflow-shapes.md` before dispatching a phase: it covers when to fan out by skill versus by problem, why a shared contract must be authored before a parallel rewrite, and which phases must stay serial.

The one rule worth stating inline: **fan out by disjoint file ownership, never by item.** Items cross files; agents that share a file lose each other's edits.
