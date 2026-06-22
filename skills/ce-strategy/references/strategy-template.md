# Strategy Template（策略模板）

Interview 完成后由 `SKILL.md` 加载。使用 captured answers 填写，并写入 `STRATEGY.md`。

## 填写规则

- 尽可能使用用户自己的语言。不要改写成 generic PM-speak。
- 每个 section 保持 compact。整篇 doc 应能在 5 分钟内读完。
- Section order 已锁定。不要添加新的 top-level sections。
- Optional sections：未使用时完整删除。不要留下 empty headers。
- 将 YAML frontmatter 中的 `last_updated` 设置为今天的 ISO date（YYYY-MM-DD）。不要在 prose 中重复 date。
- 将 frontmatter 中的 `name` 设置为 product 或 initiative name（与 H1 title 使用同一值）。

## Template（模板）

下面的 block 是要写入的 literal file（不包括本行和 fences）。用 captured answer 替换每个 `{{placeholder}}`。删除所有 placeholder 未被回答的 optional section。

~~~markdown
---
name: {{product_name}}
last_updated: {{YYYY-MM-DD}}
---

# {{product_name}} Strategy

## Target problem

{{1-2 sentence diagnosis. Names the user situation and the crux that makes it hard. No solution language.}}

## Our approach

{{1-2 sentence guiding policy. What this product commits to, so that the target problem becomes tractable.}}

## Who it's for

**Primary:** {{Persona name}} - {{one-sentence JTBD, e.g. "They're hiring {{product_name}} to..."}}

<!-- Duplicate the block above for additional personas only if truly necessary. Fewer is better. -->

## Key metrics

- **{{metric 1 name}}** - {{one-line definition; where it's measured}}
- **{{metric 2 name}}** - {{...}}
- **{{metric 3 name}}** - {{...}}

<!-- 3-5 total. Stop at 5. -->

## Tracks

### {{Track 1 name}}

{{One line: what this track is - the investment area, not a feature list.}}

_Why it serves the approach:_ {{one line}}

<!-- Duplicate the block above for 2-4 tracks total. If you can't keep it to 4, something is wrong - fold related tracks together. -->

## Milestones

- **{{YYYY-MM-DD}}** - {{milestone}}

<!-- Optional. Delete the section if unused. Only externally visible milestones: launches, fundraises, conferences, renewals. -->

## Not working on

- {{one line per item}}

<!-- Optional. Delete the section if unused. Use only for things the team keeps being tempted by. -->

## Marketing

**One-liner:** {{single-sentence pitch}}

**Key message:** {{2-3 lines if useful}}

<!-- Optional. Delete the section if unused. -->
~~~

## Post-write checklist（写入后检查清单）

确认写入前，扫描 draft：

- [ ] Frontmatter 位于顶部，并包含 `name` 和 `last_updated` keys。
- [ ] `last_updated` 使用今天的 ISO format date（YYYY-MM-DD）。
- [ ] 除 Tracks 外，没有 section 超过 4 句话（Tracks 中每个 track 有自己的 short block）。
- [ ] 没有剩余 placeholders（`{{...}}`）。
- [ ] 没有内容的 optional sections 已删除，而不是留空。
- [ ] Metric count 在 3 到 5 之间。Track count 在 2 到 4 之间。
- [ ] Target problem 和 Our approach 相互连接：后者清楚回应前者。
