# Privacy & Data Handling（隐私与数据处理）

本仓库包含：

- 一个由 markdown/config 内容组成的 plugin package（`plugins/compound-engineering`）
- 一个 CLI（`@every-env/compound-plugin`），用于为不同 AI coding tools 转换并安装 plugin content

## Summary（摘要）

- Plugin package 不包含 telemetry 或 analytics 代码。
- Plugin package 不运行会自动上传 repository/workspace 内容的后台服务。
- 只有当你的 host/tooling 或你明确调用的 integration 发起网络请求时，数据才会离开你的机器。

## What May Send Data（哪些内容可能发送数据）

1. AI host/model providers（AI host/model providers）

如果你在 Claude Code、Cursor、Gemini CLI、Copilot、Kiro、Windsurf 等工具中运行此 plugin，这些工具可能会把 prompts/context/code 发送给它们配置的 model providers。该行为由这些工具和 provider 控制，不由本 plugin repository 控制。

2. Optional integrations and tools（可选 integrations 和 tools）

Plugin 包含一些可选能力；只有在明确使用时，它们才可能调用外部服务，例如：

- Context7 MCP（`https://mcp.context7.com/mcp`），用于文档查询
- Proof（`https://www.proofeditor.ai`），用于 share/edit flows
- 其他 opt-in skills（例如 image generation 或 cloud upload workflows），它们会调用各自的外部 API/services

如果你不调用这些 integrations，它们不会传输你的 project data。

3. Package/installer infrastructure（package/installer 基础设施）

安装 dependencies 或 packages（例如 `npm`、`bunx`）会按你的 package manager configuration 与 package registries/CDNs 通信。

## Data Ownership and Retention（数据所有权与保留）

本仓库不运营用于收集或存储你的 project/workspace data 的 backend service。Model prompts 或 optional integrations 的数据保留与处理规则由你使用的外部服务决定。

## Security Reporting（安全报告）

如果你发现本仓库中的安全问题，请按 [SECURITY.md](SECURITY.md) 中的披露流程处理。
