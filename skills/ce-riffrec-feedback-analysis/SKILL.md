---
name: ce-riffrec-feedback-analysis
description: Riffrec product-feedback workflow。当用户发布 `riffrec-*.zip`、包含 `session.json` + `events.json` + `recording.webm` + `voice.webm` 的 bundle、用于 product feedback 的 video/audio recording，或询问如何 capture/share Riffrec sessions 时，ALWAYS load。用于在 setup、quick bug report 和 extensive analysis 之间路由。
---

# Riffrec Feedback Analysis（Riffrec 反馈分析）

把 raw product feedback 转成 downstream agents 可用的 structured evidence。此 skill 是 [Riffrec](https://github.com/kieranklaassen/riffrec) 的 consumption side；Riffrec 是一个 capture tool，会记录同步的 screen + voice + event sessions，并输出 `riffrec-*.zip` bundle。

## Choose the path（选择路径）

根据 input 路由到匹配的 reference。只读取该 reference；不要加载其他 references。

- **Setup** — 用户尚无 recording，并询问如何 install Riffrec、capture session 或 share feedback。读取 `references/install-riffrec.md`。
- **Quick bug report** — input 是 short recording（约 60 秒以内）、用户描述单个 specific issue，或要求 "quick"、"small"、"just transcribe"。读取 `references/quick-bug-report.md`。输出一份 concise bug report；跳过 full artifact set 和 brainstorm handoff。
- **Extensive analysis** — input 是 longer recording、包含 multiple issues / requirements / workflow walkthroughs，或用户想要 requirements 或 brainstorm material。读取 `references/extensive-analysis.md`。始终继续进入 `ce-brainstorm` skill。

当 input ambiguous（例如 zip 没有 context）时，先检查 recording length 和 event count，再选择路径。如果仍不清楚，在运行任何 heavy work 前询问用户适用哪条 path。

## Common rules（通用规则）

- 默认保持 raw recordings、audio chunks、zip contents、session dumps 和 extracted screenshots local-only。除非用户明确要求且 privacy 可接受，不要 commit `raw/` 或 `frames/` directories。
- Text/metadata artifacts（requirements docs、analysis summaries、problem analyses、source manifests）在 traceability 需要且不含 sensitive data 时可以 commit。
- 在任何 committed doc 中使用 repo-relative screenshot paths，方便后续 agents 无需 absolute local paths 即可打开 evidence。

## Analyzer entrypoint（Analyzer 入口）

所有 non-setup paths 共用同一个 analyzer：

```bash
python scripts/analyze_riffrec_zip.py /path/to/input
```

Accepted inputs：Riffrec `.zip`、`.mp4` / `.mov` / `.webm` video、`.m4a` / `.mp3` / `.wav` audio file，或 meeting-notes `.md`。使用 `--output-dir <dir>` 控制 artifacts 落点。在有 `docs/brainstorms/` 的 repos 中，default 是 `docs/brainstorms/riffrec-feedback/`。Quick path 会把 output dir override 到 temp location，避免污染 repo。

Extensive path 使用的 Compound Engineering output format 记录在 `references/compound-engineering-feedback-format.md`。
