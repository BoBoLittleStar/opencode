# OpenCode Zen

OpenCode Zen 是由 OpenCode 团队提供的经过测试和验证的模型列表。

## 概述

OpenCode Zen 是 AI 网关，让你可以访问经过基准测试的最佳模型和提供商组合。

> Zen 完全可选，使用方式与其他提供商相同。

## 端点

```bash
# API 端点格式
https://opencode.ai/zen/v1/chat/completions
https://opencode.ai/zen/v1/messages
https://opencode.ai/zen/v1/responses
```

## 支持的模型

| 模型 | 端点 | AI SDK 包 |
|------|------|----------|
| GPT 5.4 | /v1/responses | @ai-sdk/openai |
| Claude Opus 4.5 | /v1/messages | @ai-sdk/anthropic |
| Claude Sonnet 4.5 | /v1/messages | @ai-sdk/anthropic |
| Claude Haiku 4.5 | /v1/messages | @ai-sdk/anthropic |
| Gemini 3.1 Pro | /v1/models/gemini-3.1-pro | @ai-sdk/google |
| Gemini 3 Flash | /v1/models/gemini-3-flash | @ai-sdk/google |
| MiniMax M2.5 | /v1/chat/completions | @ai-sdk/openai-compatible |
| GLM 5 | /v1/chat/completions | @ai-sdk/openai-compatible |
| Kimi K2.5 | /v1/chat/completions | @ai-sdk/openai-compatible |

## 定价（每 1M Tokens）

| 模型 | 输入 | 输出 |
|------|------|------|
| Claude Opus 4.5 | $5.00 | $25.00 |
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Claude Haiku 4.5 | $1.00 | $5.00 |
| Gemini 3.1 Pro | $2.00 | $12.00 |
| MiniMax M2.5 | $0.30 | $1.20 |

## 团队功能

- **角色**：Admin（管理）和 Member（使用）
- **月度限额**：为团队和成员设置使用上限
- **模型访问**：启用/禁用特定模型
- **自带密钥**：使用自有 OpenAI/Anthropic 密钥

## 自动充值

余额低于 $5 时自动充值 $20，可自定义金额或禁用。

## 隐私

- 模型托管在 US
- 提供商遵循零保留政策
- 数据不用于训练（免费模型除外）
