# Security Policy（安全政策）

## Supported Versions（支持版本）

安全修复会应用到 `main` 上的最新版本。

## Reporting a Vulnerability（报告漏洞）

请不要为未公开的漏洞创建公开 issue。

请改为通过邮件私下报告：

- `kieran@every.to`

请包含：

- 问题的清晰描述
- 复现步骤或 proof of concept
- 影响评估（攻击者可以做什么）
- 任何建议的缓解措施

我们会尽快确认收到，并与你一起完成验证、修复和协调披露时间。

## Scope Notes（范围说明）

这个仓库主要包含 plugin instructions/configuration，以及一个 conversion/install CLI。

- Plugin instruction content 本身不会作为 server process 运行。
- 安全和隐私行为也取决于 host AI tool，以及你明确调用的任何外部集成。

数据处理详情见 [PRIVACY.md](PRIVACY.md)。
