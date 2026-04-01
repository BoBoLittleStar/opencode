# Web 界面

OpenCode 可以作为 Web 应用在浏览器中运行。

## 启动 Web 界面

```bash
opencode web
```

这会启动本地服务器并自动打开浏览器。

> Windows 用户推荐从 WSL 而非 PowerShell 运行。

## 配置选项

| 选项 | 说明 |
|------|------|
| `--port` | 指定端口 |
| `--hostname` | 监听主机（默认 `127.0.0.1`）|
| `--mdns` | 启用 mDNS 发现 |
| `--mdns-domain` | 自定义 mDNS 域名 |
| `--cors` | 添加 CORS 允许来源 |

### 端口和主机名

```bash
opencode web --port 4096
opencode web --hostname 0.0.0.0  # 网络可访问
```

### mDNS 发现

```bash
opencode web --mdns
opencode web --mdns --mdns-domain myproject.local
```

### CORS

```bash
opencode web --cors https://example.com
```

### 身份验证

```bash
OPENCODE_SERVER_PASSWORD=secret opencode web
```

用户名默认为 `opencode`，可通过 `OPENCODE_SERVER_PASSWORD` 更改。

## 连接到服务器

将终端 TUI 连接到 Web 服务器：

```bash
# 启动 Web 服务器
opencode web --port 4096

# 连接 TUI
opencode attach http://localhost:4096
```

## 配置文件

```json
{
  "server": {
    "port": 4096,
    "hostname": "0.0.0.0",
    "mdns": true,
    "cors": ["https://example.com"]
  }
}
```

命令行标志优先级高于配置文件。

## Web 功能

- 查看和管理会话
- 创建新会话
- 查看服务器状态
- 与终端共享会话
