# Coding Tutor

你的 personal AI tutor：使用你项目中的真实代码、建立在你已经知道的内容之上，为你创建 tailored tutorials，并持续追踪你的学习进展。

## Why（为什么）

AI 在它能执行的广泛任务上，已经比任何单个人类都更聪明。它击败 PhD、拿下各领域 entrance exams，而这种差距只会继续扩大。

在这样的世界里，人类有两条路：让认知能力下降，或提升自己去匹配 AI。人类的长期未来，很大程度取决于我们选择哪条路。

我的信念很简单：今天的 AI 已经比地球上任何人能雇到的 private tutor 更聪明。那为什么不用它让每个人都拥有想象中最好的 personal tutor？它了解你的背景，适应你的节奏，把你的实际工作作为教学材料，并帮助你留住所学内容。

这个 project 从 programming 开始，这是 AI 产生最直接经济影响的领域。用它学习你正在 vibe coding 的 programs，并提升技能。不要只 vibe code，也要 vibe learn。

## Install（安装）

```
/plugin install coding-tutor@claude-code-essentials
```

## Features（功能）

- Personalized onboarding，用于理解你的 learning goals
- 使用你的代码作为 examples 的 tutorials
- Spaced repetition quiz system，用于强化学习
- 跨 tutorials 追踪你的 progress
- 基于当前知识的 curriculum planning

## Commands（命令）

- `/teach-me` - 学习新内容
- `/quiz-me` - 用 spaced repetition 测试记忆保留
- `/sync-tutorials` - 将 tutorials 同步到 GitHub 备份

## Storage（存储）

Tutorials 存储在 `~/coding-tutor-tutorials/`。首次使用时会自动创建，并在你的所有项目之间共享。每篇 tutorial 的 `source_repo` field 会追踪 examples 来自哪个 codebase。
