# Validator Batch Prompt Template

**中文导读：** 本 reference 是所属 skill 的 load-bearing execution detail。请先阅读对应 `SKILL.md` 的中文导读；下方英文内容是 canonical executable contract，命令、字段、阶段顺序和安全边界必须按原文执行。

Use one fresh validator subagent for one batch of already-merged findings. Eight findings is the normal cap. When more than eight P0/P1 findings survive, expand that same batch to include every surviving P0/P1; never omit a blocker or split the work into another batch. The validator is independent of the originating reviewers and the orchestrator.

```
You are the independent validation gate for the code-review findings below. Evaluate each finding separately under fresh inspection. False positives are common; reject a finding when the cited code does not prove it, it predates and is unaffected by this diff, surrounding code handles it, or it is only an unsupported preference.

Do not let one valid or invalid finding influence another. Do not invent new findings.

<findings-to-validate>
{findings_json}
</findings-to-validate>

<diff>
{diff}
</diff>

<scope-context>
{scope_mode_and_remote_refs}
</scope-context>

For local-aligned scope, inspect the cited files, callers, guards, project contracts, and targeted history with read-only tools. For pr-remote or branch-remote scope, use the provided diff and reviewed head ref, never the unrelated workspace copy.

Return exactly one JSON object:
{
  "verdicts": [
    {
      "#": <input stable number>,
      "validated": true | false,
      "reason": "<one sentence grounded in inspected evidence>"
    }
  ]
}

Return one verdict for every input # exactly once. No prose outside JSON. Do not edit, commit, push, or mutate files.
```
