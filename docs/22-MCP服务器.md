# MCP 服务器

Model Context Protocol 服务器，允许集成外部工具和服务。

## 配置

```json
{
  "mcp": {
    "server-name": {
      "type": "local",
      "command": ["npx", "-y", "mcp-command"],
      "enabled": true
    }
  }
}
```

## 本地 MCP 服务器

```json
{
  "mcp": {
    "my-local": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-everything"]
    }
  }
}
```

### 选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `type` | string | 必须为 `"local"` |
| `command` | array | 启动命令 |
| `environment` | object | 环境变量 |
| `enabled` | boolean | 启动时启用 |
| `timeout` | number | 超时（毫秒，默认 5000）|

## 远程 MCP 服务器

```json
{
  "mcp": {
    "my-remote": {
      "type": "remote",
      "url": "https://my-mcp-server.com",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer MY_API_KEY"
      }
    }
  }
}
```

### 选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `type` | string | 必须为 `"remote"` |
| `url` | string | 服务器 URL |
| `enabled` | boolean | 启用 |
| `headers` | object | 请求头 |
| `oauth` | object | OAuth 配置 |
| `timeout` | number | 超时（毫秒）|

## OAuth

OpenCode 自动处理 OAuth 身份验证。

### 自动认证

大多数服务器无需配置，OpenCode 会提示授权。

### 预注册凭据

```json
{
  "mcp": {
    "my-oauth-server": {
      "type": "remote",
      "url": "https://mcp.example.com/mcp",
      "oauth": {
        "clientId": "{env:MY_CLIENT_ID}",
        "clientSecret": "{env:MY_CLIENT_SECRET}",
        "scope": "tools:read tools:execute"
      }
    }
  }
}
```

### 禁用 OAuth

```json
{
  "mcp": {
    "my-api-key-server": {
      "type": "remote",
      "url": "https://mcp.example.com/mcp",
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {env:MY_API_KEY}"
      }
    }
  }
}
```

## 管理

### CLI 命令

```bash
opencode mcp add              # 添加 MCP
opencode mcp list            # 列出服务器
opencode mcp auth <name>     # 认证
opencode mcp auth list        # 认证状态
opencode mcp logout <name>   # 移除凭据
opencode mcp debug <name>     # 调试 OAuth
```

## 全局禁用工具

```json
{
  "tools": {
    "my-mcp*": false
  }
}
```

## 按代理配置

```json
{
  "tools": {
    "my-mcp*": false
  },
  "agent": {
    "my-agent": {
      "tools": {
        "my-mcp*": true
      }
    }
  }
}
```

## 示例

### Sentry

```json
{
  "mcp": {
    "sentry": {
      "type": "remote",
      "url": "https://mcp.sentry.dev/mcp",
      "oauth": {}
    }
  }
}
```

### Context7

```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

> 注意：MCP 服务器会占用上下文空间，请谨慎选择。
