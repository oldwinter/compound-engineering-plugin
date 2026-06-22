---
title: "将数据处理卸载到 bundled scripts 以减少 token 消耗"
category: "skill-design"
date: "2026-03-17"
tags:
  - token-optimization
  - skill-architecture
  - bundled-scripts
  - data-processing
severity: "high"
component: "skills"
---

# Script-First Skill 架构

当 skill 处理大型数据集（session transcripts、log files、configuration inventories）时，让模型亲自处理是非常耗 token 的反模式。将数据处理移入 bundled script，并让模型只呈现结果，可将 token 使用量降低 60-75%。（至于该用哪种语言编写脚本，请参见 [prefer-python-over-bash-for-pipeline-scripts](../best-practices/prefer-python-over-bash-for-pipeline-scripts.md)；本文讨论的是*是否*卸载，而不是*使用哪种语言*。）

## 来源

这个经验来自构建 `claude-permissions-optimizer` skill（后来从 plugin 中移除，改由 `/less-permission-prompts` 承担），该 skill 会分析 Claude Code session transcripts，找出可以安全 auto-allow 的 Bash commands。早期迭代让模型读取 JSONL session files，根据 370 行 reference doc 分类 commands，并归一化 patterns，每次运行平均消耗 85-115k tokens。把所有处理移入 extraction script 后，在输出质量等价的情况下，每次运行降到约 40k tokens。今天 `ce-sessions` 仍在使用同一模式：bundled `extract-metadata.py` / `extract-skeleton.py` scripts 负责 session discovery 和 classification，模型只负责呈现。

## 反模式：Model-as-Processor

构建接触数据的 skill 时，默认直觉往往是让模型把所有内容读入 context、解析、分类并推理。小输入可以这样做，但扩展性很差：

- Token 使用量会随数据量线性增长
- 大多数 tokens 花在机械工作上（解析 JSON、匹配 patterns、统计频率）
- 为 classification rules 加载 reference docs 会进一步膨胀 context
- 模型真实判断对 classification output 的贡献几乎为零

## 模式：Script Produces, Model Presents

```
skills/<skill-name>/
  SKILL.md              # Instructions: run script, present output
  scripts/
    process.py          # Does ALL data processing, outputs JSON
```

1. **Script 完成所有机械工作。** 读取文件、解析 structured formats、应用 classification rules（regex、keyword lists）、归一化结果、计算 counts。向 stdout 输出预分类的 JSON。

2. **SKILL.md 只指示呈现。** 运行脚本、读取 JSON、为用户格式化结果。明确禁止重新分类、重新解析或加载 reference files。

3. **Rules 的单一事实源。** Classification logic 只存在于脚本中。SKILL.md 将脚本输出的 categories 当作既定事实引用，但不定义它们。

## Token 影响

| Approach | Tokens | Reduction |
|---|---|---|
| Model does everything (read, parse, classify, present) | ~100k | baseline |
| Added "do NOT grep session files" instruction | ~84k | 16% |
| Script classifies; model still loads reference doc | ~38k | 62% |
| Script classifies; model presents only | ~35k | 65% |

最大的单项收益来自把 classification 移入脚本。第二项收益来自移除加载 reference file 的指令：一旦脚本负责 classification，reference file 就只是维护文档。

## 适用时机

当 skill 满足以下**任一**条件时，应用 script-first architecture：

- 处理超过约 50 个 items，或读取大于数 KB 的文件
- Classification rules 是确定性的（regex、keyword lists、lookup tables）
- 输入数据遵循一致 schema（JSONL、CSV、structured logs）
- skill 运行频繁，或会输入进一步分析

**不要应用**于：
- skill 的核心价值是模型判断（code review、architectural analysis）
- 输入是非结构化自然语言
- 数据集足够小，处理成本可以忽略

## 应避免的反模式

- **Instruction-only optimization。** 只在 SKILL.md 中添加“不要做 X”，却不提供 script alternative。模型会找到其他高 token 成本的路径来得到同一结果。

- **Hybrid classification。** 让脚本分类一部分 items，再让模型分类剩余 items。这仍会加载 context 和 reference docs。要彻底交给脚本。脚本无法分类的 items 应被丢为 "unclassified"，不要交给模型。

- **Dual rule definitions。** Classification rules 同时存在于脚本和 SKILL.md。它们会漂移，模型可能覆盖脚本决策，tokens 也会浪费在重新评估上。保持单一事实源。

## Skill Authors 检查清单

- [ ] 数据处理能否表达为确定性逻辑（regex、keyword matching、field checks）？
- [ ] Script 是所有 classification rules 的唯一 owner
- [ ] SKILL.md 指示模型把运行脚本作为第一个动作
- [ ] SKILL.md 不重述或复制脚本的 classification logic
- [ ] Script output 是模型可直接呈现的 structured JSON
- [ ] Reference docs 可供 maintainers 使用，但 runtime 永不加载
- [ ] 构建后，验证模型没有执行任何机械解析或 rule-application 工作

## 相关

- [Reduce plugin context token usage](../../plans/2026-02-08-refactor-reduce-plugin-context-token-usage-plan.md) -- 建立了 descriptions 用于 discovery、详细内容属于正文的原则
- [Compound refresh skill improvements](compound-refresh-skill-improvements.md) -- autonomous skill execution 和 subagent architecture 的 patterns
- [Beta skills framework](beta-skills-framework.md) -- skill organization 和 rollout conventions
