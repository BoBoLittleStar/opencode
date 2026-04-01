# IDE 集成

OpenCode 可与 VS Code、Cursor 及支持终端的 IDE 集成。

## 使用方式

| 操作 | 快捷键 |
|------|--------|
| 打开/聚焦 OpenCode | `Cmd+Esc` (Mac) / `Ctrl+Esc` (Win/Linux) |
| 新建会话 | `Cmd+Shift+Esc` (Mac) / `Ctrl+Shift+Esc` (Win/Linux) |
| 插入文件引用 | `Cmd+Option+K` (Mac) / `Alt+Ctrl+K` (Win/Linux) |

## 功能特性

- **快速启动**：一键打开分屏终端视图
- **新建会话**：即使有会话运行也创建新会话
- **上下文感知**：自动共享当前选中内容或标签页
- **文件引用**：快捷插入文件引用

## 安装

### 自动安装

1. 打开 VS Code 集成终端
2. 运行 `opencode`
3. 扩展自动安装

### 手动安装

在扩展商店搜索 **OpenCode** 并安装。

## 支持的 IDE

- VS Code
- Cursor
- Windsurf
- VSCodium

## 故障排除

如果扩展未能自动安装：

1. 确保在集成终端中运行 `opencode`
2. 确认 IDE CLI 命令已安装：
   - VS Code: `code`
   - Cursor: `cursor`
   - Windsurf: `windsurf`
   - VSCodium: `codium`

3. 如未安装，按 `Cmd+Shift+P` / `Ctrl+Shift+P`，搜索 "Shell Command: Install 'code' command in PATH"
4. 确保 IDE 有权限安装扩展

## 编辑器配置

如需在 `/editor` 或 `/export` 中使用自己的 IDE：

```bash
# Linux/macOS
export EDITOR="code --wait"

# Windows
set EDITOR=code --wait
```
