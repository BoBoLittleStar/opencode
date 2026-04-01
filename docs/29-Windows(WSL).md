# Windows (WSL)

通过 WSL 在 Windows 上运行 OpenCode 以获得最佳体验。

## 为什么选择 WSL

- 更出色的文件系统性能
- 完整的终端支持
- 与开发工具良好兼容

## 安装配置

### 1. 安装 WSL

```bash
wsl --install
```

### 2. 在 WSL 中安装 OpenCode

```bash
curl -fsSL https://opencode.ai/install | bash
```

### 3. 使用 OpenCode

```bash
cd /mnt/c/Users/YourName/project
opencode
```

## 桌面应用 + WSL 服务器

1. **WSL 中启动服务器**

```bash
opencode serve --hostname 0.0.0.0 --port 4096
```

2. **桌面应用连接** `http://localhost:4096`

> 如 localhost 不可用，使用 WSL IP 地址：

```bash
hostname -I  # 获取 WSL IP
# 连接 http://<wsl-ip>:4096
```

### 保护服务器

```bash
OPENCODE_SERVER_PASSWORD=your-password opencode serve --hostname 0.0.0.0
```

## Web 客户端 + WSL

```bash
# 在 WSL 终端中运行
opencode web --hostname 0.0.0.0

# 在 Windows 浏览器中访问
http://localhost:<port>
```

## 访问 Windows 文件

- `C:` 盘 → `/mnt/c/`
- `D:` 盘 → `/mnt/d/`

```bash
cd /mnt/c/Users/YourName/Documents/project
```

> 为获得更流畅体验，建议将仓库克隆到 WSL 文件系统（如 `~/code/`）。

## 使用技巧

- 对于存储在 Windows 驱动器上的项目，在 WSL 中运行 OpenCode
- 搭配 VS Code WSL 扩展使用
- OpenCode 配置存储在 WSL 的 `~/.local/share/opencode/`
