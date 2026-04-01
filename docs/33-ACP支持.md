# ACP 支持

Agent Client Protocol 支持，允许在兼容编辑器中使用 OpenCode。

## 支持的编辑器

- Zed
- JetBrains IDEs
- Avante.nvim
- CodeCompanion.nvim

## Zed

添加到 `~/.config/zed/settings.json`：

```json
{
  "agent_servers": {
    "OpenCode": {
      "command": "opencode",
      "args": ["acp"]
    }
  }
}
```

### 快捷键绑定

```json
[
  {
    "bindings": {
      "cmd-alt-o": [
        "agent::NewExternalAgentThread",
        {
          "agent": {
            "custom": {
              "name": "OpenCode",
              "command": {
                "command": "opencode",
                "args": ["acp"]
              }
            }
          }
        }
      ]
    }
  }
]
```

## JetBrains IDEs

添加到 `acp.json`：

```json
{
  "agent_servers": {
    "OpenCode": {
      "command": "/absolute/path/bin/opencode",
      "args": ["acp"]
    }
  }
}
```

## Avante.nvim

```lua
{
  acp_providers = {
    ["opencode"] = {
      command = "opencode",
      args = { "acp" }
    }
  }
}
```

### 带环境变量

```lua
{
  acp_providers = {
    ["opencode"] = {
      command = "opencode",
      args = { "acp" },
      env = {
        OPENCODE_API_KEY = os.getenv("OPENCODE_API_KEY")
      }
    }
  }
}
```

## CodeCompanion.nvim

```lua
require("codecompanion").setup({
  interactions = {
    chat = {
      adapter = {
        name = "opencode",
        model = "claude-sonnet-4",
      },
    },
  },
})
```

## 功能支持

通过 ACP 使用时功能与终端完全一致：
- 内置工具
- 自定义工具和命令
- MCP 服务器
- AGENTS.md 规则
- 格式化工具和检查工具
- 代理和权限系统

> 部分斜杠命令（如 `/undo`、`/redo`）暂不支持。
