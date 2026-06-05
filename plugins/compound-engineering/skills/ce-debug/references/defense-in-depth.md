# Defense-in-Depth（纵深防御）

当 bug 是由 invalid state 到达 vulnerable code path 引起时，只修一层会让其他 code paths、refactors 或 mocks 重新引入同一 bug。Defense-in-depth 通过在多层验证，让该 bug 在结构上更难被重新制造。

不是每个 bug 都值得这样做。以下情况使用：

- root-cause pattern 存在于另外 3+ 个文件中（grep fix signature）
- bug 如果进入 production 会造成灾难性后果
- vulnerable operation 无论 caller 是谁都危险（destructive side effects、security-sensitive、irreversible）

当 root cause 是一次性 logic error，且没有现实的 recurrence path 时，跳过。

## 四层

选择适用的 layers。不是每个 bug 都需要全部四层。

| Layer（层） | Purpose（目的） | Apply when（适用条件） | Example（示例） |
|-------|---------|------------|---------|
| 1. Entry validation | 在 API boundary 拒绝明显 invalid input | bug 是由 caller 传入本应被拒绝的 bad data 引起 | 在任何 downstream code 接触 `workingDirectory` 前，如果它为空或不存在就 throw |
| 2. Invariant / business-logic check | 强制 data 对此 operation 有意义 | operation 有 entry validation 无法表达的 preconditions | 在发起 password reset 前 assert `user.state === 'verified'` |
| 3. Environment guard | 在无意义的 contexts 中拒绝 dangerous operations | operation 如果在错误 environment 中运行会造成灾难性后果 | 在 tests（`NODE_ENV === 'test'`）中，拒绝在 OS temp dir 外执行 `git init` |
| 4. Diagnostic breadcrumb | 在 risky operation 前捕获 forensic context | 其他 layers 仍可能被绕过；未来 failures 需要 evidence | 在 `git init` 前立即 log `{ directory, cwd, env, stack }` |

## 应用此 pattern

1. 从 bad value 的 origin 开始，追踪它经过的每个 function 的 data flow。
2. 映射 checkpoints：在哪些点 validation 本可以更早拒绝 bad value？
3. 在适当 layers 添加 guards。每个 guard 都应尽可能窄：只验证该 layer 负责的内容，不重复其他 layers 的 checks。
4. 独立测试每个 guard：构造绕过 layer 1 的 case，并验证 layer 2 仍能捕获它。

## 常见错误

- **在每层重复同一个 check。** 每层都应捕获不同类别的 failure。如果 layer 2 只是重复 layer 1，第二个 check 就是噪音。
- **没有 bug 证明必要性就 speculative 添加 guards。** Defense-in-depth 是对已观察到 failure mode 的响应，不是通用 code-hygiene practice。
- **遗漏 layer 4（diagnostic breadcrumb）。** 当 layers 1-3 仍被绕过时（迟早会发生），breadcrumb 才能让下一个 bug 可 debug。
