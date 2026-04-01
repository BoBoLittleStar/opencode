# GitLab 集成

OpenCode 通过 GitLab CI/CD 或 GitLab Duo 与 GitLab 工作流集成。

## GitLab CI

使用社区创建的 [nagyv/gitlab-opencode](https://gitlab.com/nagyv/gitlab-opencode) CI 组件。

### 设置

1. 存储 OpenCode 认证 JSON 到 CI Variables（Settings → CI/CD → Variables）
2. 添加到 `.gitlab-ci.yml`：

```yaml
include:
  - component: $CI_SERVER_FQDN/nagyv/gitlab-opencode/opencode@2
    inputs:
      config_dir: ${CI_PROJECT_DIR}/opencode-config
      auth_json: $OPENCODE_AUTH_JSON
      message: "Your prompt here"
```

## GitLab Duo

在评论中提及 `@opencode`，OpenCode 在 GitLab CI 流水线中执行。

### 功能特性

- 问题分类
- 修复与实现（创建分支和 MR）
- 在你的 GitLab Runner 上运行

### 设置

1. 配置 GitLab Duo Agent
2. 设置 CI/CD
3. 获取 AI 模型 API 密钥
4. 创建服务账户
5. 配置 CI/CD Variables
6. 创建流程配置文件

### 使用示例

```
@opencode explain this issue
@opencode fix this
@opencode review this merge request
```

详见 [GitLab CLI agents 文档](https://docs.gitlab.com/user/duo_agent_platform/agent_assistant/)
