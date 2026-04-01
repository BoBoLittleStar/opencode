# GitHub 集成

OpenCode 可以与 GitHub 工作流集成，在 Issue 和 Pull Request 中使用。

## 功能特性

- **问题分类**：让 OpenCode 调查 Issue 并解释
- **修复实现**：自动修复 Issue 或实现功能，创建 PR
- **安全可靠**：在你自己 GitHub 运行器中执行

## 安装

### 自动安装

```bash
opencode github install
```

### 手动安装

1. 安装 [GitHub App](https://github.com/apps/opencode-agent)
2. 添加工作流文件到 `.github/workflows/opencode.yml`

```yaml
name: opencode
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  opencode:
    if: |
      contains(github.event.comment.body, '/oc') ||
      contains(github.event.comment.body, '/opencode')
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1
          persist-credentials: false
      - uses: anomalyco/opencode/github@latest
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          model: anthropic/claude-sonnet-4-20250514
```

3. 在 Settings 添加 API 密钥到 Secrets

## 支持的事件

| 事件 | 触发方式 |
|------|----------|
| `issue_comment` | 评论中提及 `/oc` 或 `/opencode` |
| `pull_request_review_comment` | PR 代码行评论 |
| `issues` | Issue 创建/编辑（需 `prompt`） |
| `pull_request` | PR 创建/更新（需 `prompt`） |
| `schedule` | 定时任务（需 `prompt`） |
| `workflow_dispatch` | 手动触发（需 `prompt`） |

## 使用示例

### 解释 Issue

```
/opencode explain this issue
```

### 修复 Issue

```
/opencode fix this
```

### 审查 PR

```
Delete the attachment from S3 when the note is removed /oc
```

### 审查特定代码行

在 PR "Files" 选项卡中对代码行评论：

```
/oc add error handling here
```

## 配置选项

| 选项 | 说明 |
|------|------|
| `model` | 使用的模型（必填） |
| `agent` | 使用的代理 |
| `share` | 是否分享会话 |
| `prompt` | 自定义提示词 |
| `token` | GitHub 访问 Token |

## 工作流权限

```yaml
permissions:
  id-token: write      # 必填
  contents: write      # 提交变更
  pull-requests: write # 创建 PR
  issues: write        # 创建 Issue
```
