# CLI 命令参考

## 全局选项

| 选项 | 简写 | 说明 |
|------|------|------|
| `--help` | `-h` | 显示帮助 |
| `--version` | `-v` | 打印版本号 |
| `--print-logs` | | 将日志输出到 stderr |
| `--log-level` | | 日志级别：DEBUG、INFO、WARN、ERROR |

## 命令

### opencode（默认 TUI）

```bash
opencode [project]
opencode --continue                    # 继续上一个会话
opencode --session <id>               # 继续指定会话
opencode --fork                       # 分叉会话
opencode --model <provider/model>      # 指定模型
opencode --agent <agent>              # 指定代理
opencode --port <port>                # 监听端口
opencode --hostname <hostname>        # 监听主机名
```

### opencode agent

管理代理。

```bash
opencode agent [command]
opencode agent create                 # 创建代理
opencode agent list                   # 列出代理
```

### opencode attach

连接已启动的服务器。

```bash
opencode attach <url>
opencode attach --dir <dir>           # 工作目录
opencode attach --session <id>        # 会话 ID
```

### opencode auth

管理提供商凭据。

```bash
opencode auth login                  # 登录提供商
opencode auth list                   # 列出已认证提供商
opencode auth ls                     # 简写
opencode auth logout                 # 登出
```

### opencode github

管理 GitHub 代理。

```bash
opencode github install              # 安装 GitHub 代理
opencode github run                  # 运行代理
  --event <event>                    # 模拟事件
  --token <token>                   # GitHub Token
```

详见 [12-GitHub.md](./12-GitHub.md)

### opencode mcp

管理 MCP 服务器。

```bash
opencode mcp add                     # 添加 MCP 服务器
opencode mcp list                    # 列出 MCP 服务器
opencode mcp ls                      # 简写
opencode mcp auth <name>            # MCP 服务器认证
opencode mcp auth list              # 列出认证状态
opencode mcp logout <name>           # 移除凭据
opencode mcp debug <name>           # 调试 OAuth
```

详见 [22-MCP服务器.md](./22-MCP服务器.md)

### opencode models

列出可用模型。

```bash
opencode models [provider]           # 按提供商筛选
opencode models --refresh           # 刷新模型列表
opencode models --verbose           # 详细输出
```

### opencode run

非交互模式运行。

```bash
opencode run [message..]
opencode run --continue             # 继续会话
opencode run --session <id>         # 指定会话
opencode run --fork                 # 分叉会话
opencode run --share                # 分享会话
opencode run --model <model>        # 指定模型
opencode run --agent <agent>        # 指定代理
opencode run --file <file>          # 附加文件
opencode run --attach <url>          # 连接到服务器
```

### opencode serve

启动无界面服务器。

```bash
opencode serve
opencode serve --port 4096          # 指定端口
opencode serve --hostname 0.0.0.0   # 监听主机
opencode serve --mdns                # 启用 mDNS
opencode serve --cors <origin>       # CORS 来源
```

详见 [27-服务器.md](./27-服务器.md)

### opencode session

管理会话。

```bash
opencode session list
opencode session list --max-count 10  # 最近 N 个
opencode session list --format json   # JSON 格式
```

### opencode stats

显示用量统计。

```bash
opencode stats
opencode stats --days 7              # 最近 N 天
opencode stats --tools 10            # 工具数量
opencode stats --models 5            # 显示模型明细
opencode stats --project <name>      # 按项目筛选
```

### opencode export

导出会话。

```bash
opencode export [sessionID]
```

### opencode import

导入会话。

```bash
opencode import session.json
opencode import https://opncd.ai/s/abc123
```

### opencode web

启动 Web 界面。

```bash
opencode web
opencode web --port 4096
opencode web --hostname 0.0.0.0
opencode web --mdns
```

详见 [09-Web.md](./09-Web.md)

### opencode acp

启动 ACP 服务器。

```bash
opencode acp
opencode acp --cwd <dir>
opencode acp --port <port>
opencode acp --hostname <hostname>
```

### opencode uninstall

卸载 OpenCode。

```bash
opencode uninstall
opencode uninstall --keep-config     # 保留配置
opencode uninstall --keep-data        # 保留数据
opencode uninstall --dry-run         # 预览
opencode uninstall --force           # 跳过确认
```

### opencode upgrade

升级 OpenCode。

```bash
opencode upgrade                    # 最新版本
opencode upgrade v0.1.48            # 指定版本
opencode upgrade --method npm       # 指定安装方式
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `OPENCODE_AUTO_SHARE` | 自动分享 |
| `OPENCODE_CONFIG` | 配置文件路径 |
| `OPENCODE_CONFIG_DIR` | 配置目录路径 |
| `OPENCODE_CONFIG_CONTENT` | 内联配置 |
| `OPENCODE_DISABLE_AUTOUPDATE` | 禁用自动更新 |
| `OPENCODE_DISABLE_LSP_DOWNLOAD` | 禁用 LSP 下载 |
| `OPENCODE_ENABLE_EXA` | 启用 Exa 搜索 |
| `OPENCODE_SERVER_PASSWORD` | 服务器密码 |
| `OPENCODE_CLIENT` | 客户端标识符 |
| `OPENCODE_EXPERIMENTAL_*` | 实验性功能 |
